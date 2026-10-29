const { getDatabase } = require('../lib/db');
const { requireOfficer } = require('../lib/auth');
const { allowMethods, reportServerError, sendJson } = require('../lib/http');

module.exports = async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;
  if (!requireOfficer(req, res)) return;

  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const area = typeof req.query.area === 'string' ? req.query.area.trim() : '';
  const conditions = [];
  const params = [];

  if (query) {
    params.push(`%${query}%`);
    conditions.push(`(p.address ILIKE $${params.length} OR p.account_no ILIKE $${params.length})`);
  }
  if (area && area !== 'all') {
    params.push(area);
    conditions.push(`p.area = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const sql = getDatabase();
    const records = await sql.query(
      `SELECT p.property_id, p.account_no, p.address, p.area, p.property_type,
              p.latitude, p.longitude, t.year, t.amount, t.status
       FROM property p
       JOIN LATERAL (
         SELECT year, amount, status FROM tax
         WHERE property_id = p.property_id ORDER BY year DESC LIMIT 1
       ) t ON true
       ${where}
       ORDER BY p.address`,
      params,
    );
    return sendJson(res, 200, records);
  } catch (error) {
    return reportServerError(res, error);
  }
};
