const { Router } = require('express');
const controller = require('./auth.controller');
const supabaseController = require('./auth-supabase.controller');
const validate = require('../../middleware/validate');
const { registerSchema, loginSchema, refreshSchema } = require('./auth.schema');

const router = Router();

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/login/faculty', validate(loginSchema), controller.loginFacultyHandler);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/supabase', supabaseController.exchangeSupabaseToken);

module.exports = router;
