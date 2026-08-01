const { Router } = require('express');
const multer = require('multer');
const controller = require('./students.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { completeProfileSchema } = require('./students.schema');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.get('/', authenticate, authorize('faculty'), controller.listStudents);
router.get('/me', authenticate, controller.getProfile);
router.put('/me', authenticate, controller.updateProfile);
router.post('/me/complete-profile', authenticate, validate(completeProfileSchema), controller.completeProfile);
router.post('/me/regenerate-qr', authenticate, controller.regenerateQr);
router.post('/me/avatar', authenticate, upload.single('avatar'), controller.uploadAvatar);
router.get('/avatars/:fileUrl', authenticate, controller.getAvatarUrl);

module.exports = router;
