const router = require('express').Router();
const slotController = require('../controllers/slot.controller');

// Public, read-only. No login needed.
router.get('/', slotController.listPublic);

module.exports = router;
