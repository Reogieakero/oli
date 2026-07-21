const { Router } = require('express');
const controller = require('./balances.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { createBalanceSchema } = require('./balances.schema');

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);
router.post('/', authenticate, authorize('faculty'), validate(createBalanceSchema), controller.create);

module.exports = router;
