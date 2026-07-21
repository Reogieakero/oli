const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('./attendance.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { scanSchema, activateSchema } = require('./attendance.schema');

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: { message: 'Too many scan requests, try again later', statusCode: 429 } },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post('/activate', validate(activateSchema), controller.activateSession);
router.post('/scan', scanLimiter, validate(scanSchema), controller.scan);
router.get('/history', authenticate, controller.history);
router.get('/sanctions', authenticate, controller.sanctionStatus);

module.exports = router;
