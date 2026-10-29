const { clearSessionCookie } = require('../lib/auth');
const { allowMethods, sendJson } = require('../lib/http');

module.exports = function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  clearSessionCookie(res);
  return sendJson(res, 200, { success: true });
};
