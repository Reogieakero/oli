const balanceService = require('./balances.service');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await balanceService.listBalances(req.user, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const balance = await balanceService.getBalance(req.params.id);
    res.json(balance);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const balance = await balanceService.createBalance(req.parsed.body);
    res.status(201).json(balance);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create };
