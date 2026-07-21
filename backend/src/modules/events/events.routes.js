const { Router } = require('express');
const controller = require('./events.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { createEventSchema } = require('./events.schema');

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);
router.post('/', authenticate, authorize('faculty'), validate(createEventSchema), controller.create);
router.put('/:id', authenticate, authorize('faculty'), controller.update);
router.delete('/:id', authenticate, authorize('faculty'), controller.remove);

module.exports = router;
