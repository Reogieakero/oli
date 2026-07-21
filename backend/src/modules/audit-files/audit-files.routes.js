const { Router } = require('express');
const multer = require('multer');
const controller = require('./audit-files.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);
router.post('/', authenticate, authorize('faculty'), upload.single('file'), controller.upload);
router.delete('/:id', authenticate, authorize('faculty'), controller.remove);
router.get('/download/:fileUrl', authenticate, controller.downloadUrl);

module.exports = router;
