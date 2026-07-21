const { Router } = require('express');
const multer = require('multer');
const controller = require('./announcements.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { createAnnouncementSchema, updateAnnouncementSchema } = require('./announcements.schema');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);
router.post(
  '/',
  authenticate,
  authorize('faculty'),
  upload.array('attachments', 10),
  validate(createAnnouncementSchema),
  controller.create
);
router.put('/:id', authenticate, authorize('faculty'), validate(updateAnnouncementSchema), controller.update);
router.delete('/:id', authenticate, authorize('faculty'), controller.remove);
router.get('/attachments/:fileUrl', authenticate, controller.getAttachmentUrl);

module.exports = router;
