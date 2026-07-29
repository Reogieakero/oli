const { Router } = require('express');
const controller = require('./auth-google.controller');

const router = Router();

router.get('/google', controller.authenticateGoogle);
router.get('/google/callback', controller.authenticateGoogleCallback);

module.exports = router;
