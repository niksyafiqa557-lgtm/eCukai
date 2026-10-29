const { getDatabase } = require('../lib/db');
const { requireOfficer } = require('../lib/auth');
const { allowMethods, reportServerError, sendJson } = require('../lib/http');

module.exports = async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;
  if (!requireOfficer(req, res)) return;

  const year = Number(req.query.year || new Date().getFullYear());
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return sendJson(res, 400, { error: 'Year must be between 2000 and 2100' });
  }

  try {
    const sql = getDatabase();
    const [stats] = await sql.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'PAID')::int AS paid,
              COUNT(*) FILTER (WHERE status = 'UNPAID')::int AS unpaid,
              COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0) AS collected
       FROM tax WHERE year = $1`,
      [year],
    );
    return sendJson(res, 200, stats);
  } catch (error) {
    return reportServerError(res, error);
  }
};
