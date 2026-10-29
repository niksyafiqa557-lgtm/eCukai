const bcrypt = require('bcryptjs');
const { getDatabase } = require('../lib/db');
const { setSessionCookie } = require('../lib/auth');
const { allowMethods, readJsonBody, reportServerError, sendJson } = require('../lib/http');

module.exports = async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  const body = readJsonBody(req);
  const staffNo = typeof body?.staff_no === 'string' ? body.staff_no.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!staffNo || !password) {
    return sendJson(res, 400, { error: 'Staff number and password are required' });
  }

  try {
    const sql = getDatabase();
    const [officer] = await sql.query(
      'SELECT id, staff_no, name, password_hash, role FROM officer WHERE staff_no = $1 LIMIT 1',
      [staffNo],
    );

    if (!officer || !(await bcrypt.compare(password, officer.password_hash))) {
      return sendJson(res, 401, { error: 'Invalid staff number or password' });
    }

    setSessionCookie(res, officer);
    return sendJson(res, 200, {
      success: true,
      officer: { staff_no: officer.staff_no, name: officer.name, role: officer.role },
    });
  } catch (error) {
    return reportServerError(res, error);
  }
};
