const { Router } = require('express');
const controller = require('./courses.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { createCourseSchema, updateCourseSchema } = require('./courses.schema');

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);
router.post('/', authenticate, authorize('faculty'), validate(createCourseSchema), controller.create);
router.put('/:id', authenticate, authorize('faculty'), validate(updateCourseSchema), controller.update);
router.delete('/:id', authenticate, authorize('faculty'), controller.remove);

module.exports = router;
