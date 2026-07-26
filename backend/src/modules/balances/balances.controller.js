const balanceService = require('./balances.service');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const filters = req.parsed ? req.parsed.query : {};
    const result = await balanceService.listBalances(req.user, page, limit, filters);
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

async function update(req, res, next) {
  try {
    const balance = await balanceService.updateBalance(req.params.id, req.parsed.body);
    res.json(balance);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await balanceService.deleteBalance(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function createBulk(req, res, next) {
  try {
    const result = await balanceService.createBalancesBulk(req.parsed.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, createBulk };
