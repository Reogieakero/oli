const { Router } = require('express');
const controller = require('./sanctions.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { createSanctionRuleSchema, updateSanctionRuleSchema, createSanctionSchema, updateSanctionSchema } = require('./sanctions.schema');

const router = Router();

router.get('/rules', authenticate, controller.listRules);
router.get('/rules/:id', authenticate, controller.getRule);
router.post('/rules', authenticate, authorize('faculty'), validate(createSanctionRuleSchema), controller.createRule);
router.put('/rules/:id', authenticate, authorize('faculty'), validate(updateSanctionRuleSchema), controller.updateRule);
router.delete('/rules/:id', authenticate, authorize('faculty'), controller.removeRule);

router.get('/', authenticate, authorize('faculty'), controller.listAll);
router.post('/', authenticate, authorize('faculty'), validate(createSanctionSchema), controller.create);
router.get('/summary', authenticate, authorize('faculty'), controller.summary);
router.get('/flagged', authenticate, authorize('faculty'), controller.listFlagged);
router.post('/auto-trigger', authenticate, authorize('faculty'), controller.runAutoTrigger);
router.get('/export', authenticate, authorize('faculty'), controller.exportAll);
router.patch('/:id', authenticate, authorize('faculty'), validate(updateSanctionSchema), controller.update);
router.get('/:id/changes', authenticate, authorize('faculty'), controller.getChanges);
router.get('/:id', authenticate, authorize('faculty'), controller.getById);

module.exports = router;
