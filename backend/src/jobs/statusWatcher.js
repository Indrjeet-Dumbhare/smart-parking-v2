const { publishIfChanged } = require('../services/broadcast.service');

// Some status changes are caused by time passing, not by a sensor:
//  - an ESP32 stops reporting (slot becomes "unknown")
//  - a reservation starts or ends
// This ticker catches those and pushes them to the browsers.
function startStatusWatcher(intervalMs = 10000) {
  return setInterval(async () => {
    try {
      await publishIfChanged();
    } catch (err) {
      console.error('Status watcher error:', err.message);
    }
  }, intervalMs);
}

module.exports = { startStatusWatcher };
