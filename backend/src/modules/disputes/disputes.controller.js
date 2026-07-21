const disputeService = require('./disputes.service');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await disputeService.listDisputes(req.user, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const dispute = await disputeService.createDispute(req.user.sub, req.parsed.body);
    res.status(201).json(dispute);
  } catch (err) {
    next(err);
  }
}

async function resolve(req, res, next) {
  try {
    const dispute = await disputeService.resolveDispute(req.params.id, req.user.sub, req.parsed.body);
    res.json(dispute);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, resolve };
