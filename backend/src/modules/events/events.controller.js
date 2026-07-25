const eventService = require('./events.service');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const courseId = req.query.courseId || undefined;
    const result = await eventService.listEvents(req.user, page, limit, courseId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const event = await eventService.getEvent(req.params.id);
    res.json(event);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const coverFile = req.file || null;
    const event = await eventService.createEvent(req.user.sub, req.parsed.body, coverFile);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const coverFile = req.file || null;
    const event = await eventService.updateEvent(req.params.id, req.parsed.body, coverFile);
    res.json(event);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await eventService.deleteEvent(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function getCoverUrl(req, res, next) {
  try {
    const url = await eventService.getCoverSignedUrl(req.params.id);
    res.json({ signedUrl: url });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, getCoverUrl };
