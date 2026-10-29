function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function allowMethods(req, res, methods) {
  res.setHeader('Allow', methods.join(', '));

  if (!methods.includes(req.method)) {
    sendJson(res, 405, { error: 'Method not allowed' });
    return false;
  }

  return true;
}

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    try {
      const body = JSON.parse(req.body);
      return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
    } catch {
      return null;
    }
  }

  return null;
}

function reportServerError(res, error) {
  console.error(error);
  sendJson(res, 500, { error: 'An unexpected server error occurred' });
}

module.exports = { allowMethods, readJsonBody, reportServerError, sendJson };
