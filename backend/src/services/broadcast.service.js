const slotService = require('./slot.service');
const { getIO } = require('../sockets');

let lastSnapshot = '';

// Pushes the public slot list to every connected browser, but only if it
// actually changed since the last push. Safe to call as often as you like.
async function publishIfChanged() {
  const slots = await slotService.getPublicSlots();
  const serialized = JSON.stringify(slots);
  if (serialized === lastSnapshot) return;

  lastSnapshot = serialized;
  getIO().emit('slots:update', slots);
}

module.exports = { publishIfChanged };
