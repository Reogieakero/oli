const { Router } = require('express');
const controller = require('./students.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = Router();

router.get('/', authenticate, authorize('faculty'), controller.listStudents);

module.exports = router;
