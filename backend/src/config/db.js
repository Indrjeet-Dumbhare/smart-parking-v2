const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({ connectionString: env.databaseUrl });

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err.message);
});

const query = (text, params) => pool.query(text, params);

// Runs `fn(client)` inside BEGIN/COMMIT, rolls back on error.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Used at startup so the API does not crash if Postgres is still booting.
async function waitForDb(retries = 15, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.log(`Waiting for database (${attempt}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Could not connect to the database');
}

module.exports = { pool, query, withTransaction, waitForDb };
