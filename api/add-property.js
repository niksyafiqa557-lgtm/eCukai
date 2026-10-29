const { getDatabase } = require('../lib/db');
const { requireOfficer } = require('../lib/auth');
const { allowMethods, readJsonBody, reportServerError, sendJson } = require('../lib/http');

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Agricultural', 'Industrial'];

function numericValue(value) {
  if ((typeof value !== 'number' && typeof value !== 'string')
      || (typeof value === 'string' && !value.trim())) {
    return Number.NaN;
  }
  return Number(value);
}

module.exports = async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  const officer = requireOfficer(req, res);
  if (!officer) return;
  if (officer.role !== 'admin') {
    return sendJson(res, 403, { error: 'This action requires an admin account' });
  }

  const body = readJsonBody(req);
  const accountNo = typeof body?.account_no === 'string' ? body.account_no.trim() : '';
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  const area = typeof body?.area === 'string' ? body.area.trim() : '';
  const type = typeof body?.property_type === 'string' ? body.property_type : '';
  const latitude = numericValue(body?.latitude);
  const longitude = numericValue(body?.longitude);
  const year = numericValue(body?.year);
  const amount = numericValue(body?.amount);
  const status = typeof body?.status === 'string' ? body.status.toUpperCase() : 'UNPAID';

  if (!accountNo || !address || !area) {
    return sendJson(res, 400, { error: 'Account number, address, and area are required' });
  }
  if (!PROPERTY_TYPES.includes(type)) {
    return sendJson(res, 400, { error: `Property type must be one of: ${PROPERTY_TYPES.join(', ')}` });
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return sendJson(res, 400, { error: 'Latitude and longitude must be valid coordinates' });
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return sendJson(res, 400, { error: 'Year must be between 2000 and 2100' });
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return sendJson(res, 400, { error: 'Amount must be a non-negative number' });
  }
  if (!['PAID', 'UNPAID'].includes(status)) {
    return sendJson(res, 400, { error: 'Status must be PAID or UNPAID' });
  }

  try {
    const sql = getDatabase();
    const [record] = await sql.query(
      `WITH new_property AS (
         INSERT INTO property (account_no, address, area, property_type, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING property_id
       )
       INSERT INTO tax (property_id, year, amount, status)
       SELECT property_id, $7, $8, $9 FROM new_property
       RETURNING property_id`,
      [accountNo, address, area, type, latitude, longitude, year, amount, status],
    );
    return sendJson(res, 200, { success: true, property_id: record.property_id });
  } catch (error) {
    if (error.code === '23505') {
      return sendJson(res, 409, { error: 'A property with this account number already exists' });
    }
    return reportServerError(res, error);
  }
};
