const { Router } = require('express');
const multer = require('multer');
const controller = require('./announcements.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { createAnnouncementSchema, updateAnnouncementSchema } = require('./announcements.schema');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/attachments/:fileUrl', authenticate, controller.getAttachmentUrl);
router.get('/:id', authenticate, controller.getById);
router.post(
  '/',
  authenticate,
  authorize('faculty'),
  upload.array('attachments', 10),
  validate(createAnnouncementSchema),
  controller.create
);
router.put('/:id', authenticate, authorize('faculty'), upload.array('attachments', 10), validate(updateAnnouncementSchema), controller.update);
router.patch('/:id/archive', authenticate, authorize('faculty'), controller.archive);
router.delete('/:id', authenticate, authorize('faculty'), controller.remove);
router.post('/:id/read', authenticate, controller.markRead);
router.get('/:id/reads', authenticate, controller.readCount);

module.exports = router;
