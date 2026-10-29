const { getDatabase } = require('../lib/db');
const { requireOfficer } = require('../lib/auth');
const { allowMethods, reportServerError, sendJson } = require('../lib/http');

module.exports = async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;
  if (!requireOfficer(req, res)) return;

  const propertyId = Number(req.query.property_id);
  if (!Number.isInteger(propertyId) || propertyId < 1) {
    return sendJson(res, 400, { error: 'A valid property_id is required' });
  }

  try {
    const sql = getDatabase();
    const [record] = await sql.query(
      `SELECT p.property_id, p.account_no, p.address, p.area, p.property_type,
              p.latitude, p.longitude, t.tax_id, t.year, t.amount, t.status,
              pay.payment_amount, pay.payment_date
       FROM property p
       JOIN LATERAL (
         SELECT tax_id, year, amount, status FROM tax
         WHERE property_id = p.property_id ORDER BY year DESC LIMIT 1
       ) t ON true
       LEFT JOIN LATERAL (
         SELECT payment_amount, payment_date FROM payment
         WHERE tax_id = t.tax_id ORDER BY payment_date DESC LIMIT 1
       ) pay ON true
       WHERE p.property_id = $1`,
      [propertyId],
    );

    if (!record) return sendJson(res, 404, { error: 'Property not found' });

    const { payment_amount: amount, payment_date: date, ...property } = record;
    property.payment = amount == null ? null : { payment_amount: amount, payment_date: date };
    return sendJson(res, 200, property);
  } catch (error) {
    return reportServerError(res, error);
  }
};
