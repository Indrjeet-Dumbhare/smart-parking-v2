const router = require('express').Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.use('/slots', require('./slot.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/guard', require('./guard.routes'));
router.use('/device', require('./device.routes'));

module.exports = router;
