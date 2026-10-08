const http = require('http');
const env = require('./config/env');
const { pool, waitForDb } = require('./config/db');
const app = require('./app');
const { initSocket } = require('./sockets');
const { startStatusWatcher } = require('./jobs/statusWatcher');
const { ensureGuardUser } = require('./services/auth.service');

async function main() {
  await waitForDb();
  await ensureGuardUser();

  const server = http.createServer(app);
  initSocket(server);
  const watcher = startStatusWatcher();

  server.listen(env.port, '0.0.0.0', () => {
    console.log(`Smart parking API listening on port ${env.port}`);
  });

  const shutdown = async () => {
    console.log('Shutting down...');
    clearInterval(watcher);
    server.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
