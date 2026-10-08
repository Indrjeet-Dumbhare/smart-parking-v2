const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

async function login(username, password) {
  const { rows } = await query(
    'SELECT id, username, password_hash FROM users WHERE username = $1',
    [username]
  );
  const user = rows[0];

  // Same error for "no such user" and "wrong password" on purpose.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, 'Wrong username or password');
  }

  const token = jwt.sign({ sub: user.id, username: user.username }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
  return { token, user: { id: user.id, username: user.username } };
}

// Creates the guard account from .env on first start, so no manual SQL is needed.
async function ensureGuardUser() {
  if (!env.guardUsername || !env.guardPassword) {
    console.warn('GUARD_USERNAME / GUARD_PASSWORD not set, no guard account created');
    return;
  }
  const existing = await query('SELECT 1 FROM users WHERE username = $1', [env.guardUsername]);
  if (existing.rows.length > 0) return;

  const hash = await bcrypt.hash(env.guardPassword, 10);
  await query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [
    env.guardUsername,
    hash,
  ]);
  console.log(`Guard account "${env.guardUsername}" created`);
}

module.exports = { login, ensureGuardUser };
