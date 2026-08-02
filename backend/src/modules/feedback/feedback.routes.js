const { Router } = require('express');
const controller = require('./feedback.controller');
const validate = require('../../middleware/validate');
const { authenticate, optionalAuthenticate, authorize } = require('../../middleware/auth');
const { createFeedbackSchema, respondToFeedbackSchema } = require('./feedback.schema');

const router = Router();

router.get('/', authenticate, controller.list);
router.post('/', optionalAuthenticate, validate(createFeedbackSchema), controller.create);
router.put('/:id/respond', authenticate, authorize('faculty'), validate(respondToFeedbackSchema), controller.respond);

module.exports = router;
