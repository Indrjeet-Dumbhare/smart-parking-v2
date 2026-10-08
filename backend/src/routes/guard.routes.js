const router = require('express').Router();
const slotController = require('../controllers/slot.controller');
const reservationController = require('../controllers/reservation.controller');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createReservationSchema,
  idParamSchema,
} = require('../validators/reservation.validator');

// Everything below needs a valid guard token.
router.use(requireAuth);

router.get('/slots', slotController.listForGuard);
router.get('/events', slotController.recentEvents);

router.get('/reservations', reservationController.list);
router.post('/reservations', validate(createReservationSchema), reservationController.create);
router.delete(
  '/reservations/:id',
  validate(idParamSchema, 'params'),
  reservationController.cancel
);

module.exports = router;
