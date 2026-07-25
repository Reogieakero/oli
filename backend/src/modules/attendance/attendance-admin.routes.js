const { Router } = require('express');
const controller = require('./attendance-admin.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { listRecordsSchema, updateRecordSchema, createRecordSchema, deleteRecordSchema } = require('./attendance-admin.schema');

const router = Router();

router.get('/records', authenticate, authorize('faculty'), validate(listRecordsSchema), controller.listRecords);
router.post('/records', authenticate, authorize('faculty'), validate(createRecordSchema), controller.createRecord);
router.patch('/records/:id', authenticate, authorize('faculty'), validate(updateRecordSchema), controller.updateRecord);
router.delete('/records/:id', authenticate, authorize('faculty'), validate(deleteRecordSchema), controller.deleteRecord);

module.exports = router;
