const { Router } = require('express');
const controller = require('./sanctions.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { createSanctionRuleSchema, updateSanctionRuleSchema } = require('./sanctions.schema');

const router = Router();

router.get('/rules', authenticate, controller.listRules);
router.get('/rules/:id', authenticate, controller.getRule);
router.post('/rules', authenticate, authorize('faculty'), validate(createSanctionRuleSchema), controller.createRule);
router.put('/rules/:id', authenticate, authorize('faculty'), validate(updateSanctionRuleSchema), controller.updateRule);
router.delete('/rules/:id', authenticate, authorize('faculty'), controller.removeRule);

router.get('/', authenticate, authorize('faculty'), controller.listAll);

module.exports = router;
