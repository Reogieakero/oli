const { Router } = require('express');
const controller = require('./students.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { completeProfileSchema } = require('./students.schema');

const router = Router();

router.get('/', authenticate, authorize('faculty'), controller.listStudents);
router.post('/me/complete-profile', authenticate, validate(completeProfileSchema), controller.completeProfile);

module.exports = router;
