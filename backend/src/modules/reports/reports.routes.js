const { Router } = require('express');
const controller = require('./reports.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = Router();

router.get('/events', authenticate, authorize('faculty'), controller.byEvent);
router.get('/courses', authenticate, authorize('faculty'), controller.byCourse);
router.get('/dashboard', authenticate, authorize('faculty'), controller.dashboard);

module.exports = router;
