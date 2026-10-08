require('dotenv').config();

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  deviceApiKey: required('DEVICE_API_KEY'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  offlineAfterSeconds: Number(process.env.OFFLINE_AFTER_SECONDS) || 90,
  guardUsername: process.env.GUARD_USERNAME || '',
  guardPassword: process.env.GUARD_PASSWORD || '',
};
