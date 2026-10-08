const slotService = require('../services/slot.service');
const { publishIfChanged } = require('../services/broadcast.service');
const asyncHandler = require('../utils/asyncHandler');

// Called by the ESP32 on every state change and as a periodic heartbeat.
const receiveReadings = asyncHandler(async (req, res) => {
  const { updated, unknownSlots } = await slotService.applyReadings(req.body.readings);
  await publishIfChanged();
  res.json({ ok: true, updated, unknownSlots });
});

module.exports = { receiveReadings };
