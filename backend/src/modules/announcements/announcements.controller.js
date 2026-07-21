const announcementService = require('./announcements.service');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await announcementService.listAnnouncements(req.user, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const announcement = await announcementService.getAnnouncement(req.params.id);
    res.json(announcement);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const announcement = await announcementService.createAnnouncement(
      req.user.sub,
      req.parsed.body,
      req.files || []
    );
    res.status(201).json(announcement);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const announcement = await announcementService.updateAnnouncement(
      req.params.id,
      req.user.sub,
      req.parsed.body
    );
    res.json(announcement);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await announcementService.deleteAnnouncement(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function getAttachmentUrl(req, res, next) {
  try {
    const url = await announcementService.getAttachmentSignedUrl(req.params.fileUrl);
    if (!url) return res.status(404).json({ error: { message: 'File not found', statusCode: 404 } });
    res.json({ signedUrl: url });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, getAttachmentUrl };
