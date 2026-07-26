const { Router } = require('express');
const controller = require('./balances.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { createBalanceSchema, updateBalanceSchema, listBalancesSchema, createBalancesBulkSchema } = require('./balances.schema');

const router = Router();

router.get('/', authenticate, validate(listBalancesSchema), controller.list);
router.get('/:id', authenticate, controller.getById);
router.post('/', authenticate, authorize('faculty'), validate(createBalanceSchema), controller.create);
router.post('/bulk', authenticate, authorize('faculty'), validate(createBalancesBulkSchema), controller.createBulk);
router.patch('/:id', authenticate, authorize('faculty'), validate(updateBalanceSchema), controller.update);
router.delete('/:id', authenticate, authorize('faculty'), controller.remove);

module.exports = router;
