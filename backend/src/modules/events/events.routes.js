const { Router } = require('express');
const multer = require('multer');
const controller = require('./events.controller');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { createEventSchema, updateEventSchema } = require('./events.schema');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);
router.get('/:id/cover-url', authenticate, controller.getCoverUrl);
router.post('/', authenticate, authorize('faculty'), upload.single('coverPhoto'), validate(createEventSchema), controller.create);
router.put('/:id', authenticate, authorize('faculty'), upload.single('coverPhoto'), validate(updateEventSchema), controller.update);
router.delete('/:id', authenticate, authorize('faculty'), controller.remove);
router.post('/:id/finalize', authenticate, authorize('faculty'), controller.finalize);

module.exports = router;
