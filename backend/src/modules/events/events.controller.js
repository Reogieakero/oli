const eventService = require('./events.service');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await eventService.listEvents(req.user, page, limit);
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
    const event = await eventService.createEvent(req.user.sub, req.parsed.body);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const event = await eventService.updateEvent(req.params.id, req.parsed.body);
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

module.exports = { list, getById, create, update, remove };
