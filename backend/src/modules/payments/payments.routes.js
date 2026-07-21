const { Router } = require('express');
const controller = require('./payments.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { createPaymentSchema, createPaymentMethodSchema } = require('./payments.schema');

const router = Router();

router.get('/methods', authenticate, controller.listMethods);
router.post('/methods', authenticate, authorize('faculty'), validate(createPaymentMethodSchema), controller.createMethod);
router.post('/', authenticate, authorize('faculty'), validate(createPaymentSchema), controller.create);

module.exports = router;
