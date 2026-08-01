const { Router } = require('express');
const multer = require('multer');
const controller = require('./payments.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { createPaymentSchema, createPaymentMethodSchema, updatePaymentMethodSchema } = require('./payments.schema');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.get('/methods', authenticate, controller.listMethods);
router.get('/receipts/:fileUrl', authenticate, controller.getReceiptUrl);
router.get('/pending', authenticate, authorize('faculty'), controller.listPending);
router.get('/all', authenticate, authorize('faculty'), controller.listAll);
router.get('/my', authenticate, controller.listMy);
router.post('/methods', authenticate, authorize('faculty'), validate(createPaymentMethodSchema), controller.createMethod);
router.patch('/methods/:id', authenticate, authorize('faculty'), validate(updatePaymentMethodSchema), controller.updateMethod);
router.delete('/methods/:id', authenticate, authorize('faculty'), controller.removeMethod);
router.post('/', authenticate, upload.single('proofReceipt'), validate(createPaymentSchema), controller.create);
router.patch('/:id/approve', authenticate, authorize('faculty'), controller.approve);
router.patch('/:id/reject', authenticate, authorize('faculty'), controller.reject);
router.patch('/:id/revert', authenticate, authorize('faculty'), controller.revert);

module.exports = router;
