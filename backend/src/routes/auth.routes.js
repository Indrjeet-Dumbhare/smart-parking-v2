const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginSchema } = require('../validators/auth.validator');

router.post('/login', validate(loginSchema), authController.login);
router.get('/me', requireAuth, authController.me);

module.exports = router;
