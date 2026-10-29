const bcrypt = require('bcryptjs');
const { getDatabase } = require('../lib/db');
const { allowMethods, readJsonBody, reportServerError, sendJson } = require('../lib/http');

module.exports = async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  const body = readJsonBody(req);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const staffNo = typeof body?.staff_no === 'string' ? body.staff_no.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!name || !staffNo || !email || password.length < 8) {
    return sendJson(res, 400, {
      error: 'All fields are required and password must be at least 8 characters',
    });
  }

  try {
    const sql = getDatabase();
    const passwordHash = await bcrypt.hash(password, 10);
    await sql.query(
      "INSERT INTO officer (staff_no, name, email, password_hash, role) VALUES ($1, $2, $3, $4, 'officer')",
      [staffNo, name, email, passwordHash],
    );
    return sendJson(res, 200, { success: true });
  } catch (error) {
    if (error.code === '23505') {
      return sendJson(res, 409, { error: 'Staff ID or email is already registered' });
    }
    return reportServerError(res, error);
  }
};
