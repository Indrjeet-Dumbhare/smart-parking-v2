const reservationService = require('../services/reservation.service');
const { publishIfChanged } = require('../services/broadcast.service');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const reservation = await reservationService.create({
    ...req.body,
    userId: req.user.id,
  });
  await publishIfChanged();
  res.status(201).json(reservation);
});

const list = asyncHandler(async (req, res) => {
  res.json(await reservationService.listUpcoming());
});

const cancel = asyncHandler(async (req, res) => {
  await reservationService.cancel(req.params.id);
  await publishIfChanged();
  res.status(204).end();
});

module.exports = { create, list, cancel };
