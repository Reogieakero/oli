const { Router } = require('express');
const controller = require('./disputes.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { createDisputeSchema, resolveDisputeSchema } = require('./disputes.schema');

const router = Router();

router.get('/', authenticate, controller.list);
router.post('/', authenticate, validate(createDisputeSchema), controller.create);
router.put('/:id/resolve', authenticate, authorize('faculty'), validate(resolveDisputeSchema), controller.resolve);

module.exports = router;
