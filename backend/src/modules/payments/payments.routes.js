const { Router } = require('express');
const controller = require('./payments.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { createPaymentSchema, createPaymentMethodSchema, updatePaymentMethodSchema } = require('./payments.schema');

const router = Router();

router.get('/methods', authenticate, controller.listMethods);
router.post('/methods', authenticate, authorize('faculty'), validate(createPaymentMethodSchema), controller.createMethod);
router.patch('/methods/:id', authenticate, authorize('faculty'), validate(updatePaymentMethodSchema), controller.updateMethod);
router.delete('/methods/:id', authenticate, authorize('faculty'), controller.removeMethod);
router.post('/', authenticate, authorize('faculty'), validate(createPaymentSchema), controller.create);

module.exports = router;
