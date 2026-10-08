const slotService = require('../services/slot.service');
const asyncHandler = require('../utils/asyncHandler');

const listPublic = asyncHandler(async (req, res) => {
  res.json(await slotService.getPublicSlots());
});

const listForGuard = asyncHandler(async (req, res) => {
  res.json(await slotService.getGuardSlots());
});

const recentEvents = asyncHandler(async (req, res) => {
  res.json(await slotService.getRecentEvents(30));
});

module.exports = { listPublic, listForGuard, recentEvents };
