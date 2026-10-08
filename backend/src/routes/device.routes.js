const router = require('express').Router();
const deviceController = require('../controllers/device.controller');
const { requireDeviceKey } = require('../middleware/deviceAuth');
const validate = require('../middleware/validate');
const { readingsSchema } = require('../validators/device.validator');

router.post('/readings', requireDeviceKey, validate(readingsSchema), deviceController.receiveReadings);

module.exports = router;
