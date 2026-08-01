const prisma = require('../../config/database');
const announcementService = require('./announcements.service');

async function list(req, res, next) {
  try {
    const result = await announcementService.listAnnouncements(req.user, req.query);
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
      req.user.email,
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
      req.parsed.body,
      req.files || []
    );
    res.json(announcement);
  } catch (err) {
    next(err);
  }
}

async function archive(req, res, next) {
  try {
    const announcement = await announcementService.archiveAnnouncement(req.params.id);
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

async function markRead(req, res, next) {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.sub } });
    if (!student) return res.status(403).json({ error: { message: 'Only students can mark as read', statusCode: 403 } });
    await announcementService.markAsRead(req.params.id, student.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function readCount(req, res, next) {
  try {
    const count = await announcementService.getReadCount(req.params.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, archive, remove, getAttachmentUrl, markRead, readCount };
