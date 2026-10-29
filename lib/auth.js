const { createHmac, timingSafeEqual } = require('node:crypto');

const COOKIE_NAME = 'ecukai_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters');
  }
  return secret;
}

function sign(value) {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function setSessionCookie(res, officer) {
  const payload = Buffer.from(JSON.stringify({
    officer_id: officer.id,
    name: officer.name,
    role: officer.role,
    expires_at: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;

  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

function getOfficer(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map(part => part.trim())
    .find(part => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return null;

  const token = cookie.slice(COOKIE_NAME.length + 1);
  const separator = token.lastIndexOf('.');
  if (separator < 1) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(payload);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.officer_id || session.expires_at <= Math.floor(Date.now() / 1000)) return null;
    return {
      id: session.officer_id,
      name: session.name,
      role: session.role,
    };
  } catch {
    return null;
  }
}

function requireOfficer(req, res) {
  let officer;
  try {
    officer = getOfficer(req);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'Server authentication is not configured' }));
    return null;
  }

  if (!officer) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'Please log in first' }));
    return null;
  }
  return officer;
}

module.exports = { clearSessionCookie, getOfficer, requireOfficer, setSessionCookie };
