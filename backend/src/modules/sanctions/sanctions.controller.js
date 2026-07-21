const sanctionService = require('./sanctions.service');

async function listRules(_req, res, next) {
  try {
    const rules = await sanctionService.listSanctionRules();
    res.json({ data: rules });
  } catch (err) {
    next(err);
  }
}

async function getRule(req, res, next) {
  try {
    const rule = await sanctionService.getSanctionRule(req.params.id);
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

async function createRule(req, res, next) {
  try {
    const rule = await sanctionService.createSanctionRule(req.parsed.body);
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
}

async function updateRule(req, res, next) {
  try {
    const rule = await sanctionService.updateSanctionRule(req.params.id, req.parsed.body);
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

async function removeRule(req, res, next) {
  try {
    await sanctionService.deleteSanctionRule(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function listAll(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await sanctionService.listSanctions(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listRules, getRule, createRule, updateRule, removeRule, listAll };
