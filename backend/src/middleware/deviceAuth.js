const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// Protects the ESP32 endpoint. Expects header: x-api-key: <DEVICE_API_KEY>
function requireDeviceKey(req, res, next) {
  const provided = Buffer.from(String(req.headers['x-api-key'] || ''));
  const expected = Buffer.from(env.deviceApiKey);

  const valid =
    provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

  if (!valid) {
    return next(new ApiError(401, 'Invalid device key'));
  }
  return next();
}

module.exports = { requireDeviceKey };
