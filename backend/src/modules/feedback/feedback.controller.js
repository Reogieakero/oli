const feedbackService = require('./feedback.service');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await feedbackService.listFeedback(req.user, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const feedback = await feedbackService.createFeedback(req.user.sub, req.parsed.body);
    res.status(201).json(feedback);
  } catch (err) {
    next(err);
  }
}

async function respond(req, res, next) {
  try {
    const feedback = await feedbackService.respondToFeedback(req.params.id, req.parsed.body.response);
    res.json(feedback);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, respond };
