const prisma = require('../../config/database');
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
    const filters = {};
    if (req.query.search) filters.search = req.query.search;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.sanctionLevel) filters.sanctionLevel = req.query.sanctionLevel;
    if (req.query.type) filters.type = req.query.type;
    const result = await sanctionService.listSanctions(page, limit, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const sanction = await sanctionService.getSanction(req.params.id);
    res.json(sanction);
  } catch (err) {
    next(err);
  }
}

async function summary(_req, res, next) {
  try {
    const result = await sanctionService.getSanctionSummary();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user.sub } });
    const data = {
      ...req.parsed.body,
      issuedById: faculty ? faculty.id : undefined,
    };
    const sanction = await sanctionService.createSanction(data);
    res.status(201).json(sanction);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user.sub } });
    const sanction = await sanctionService.updateSanction(req.params.id, req.parsed.body, faculty ? faculty.id : undefined);
    res.json(sanction);
  } catch (err) {
    next(err);
  }
}

async function runAutoTrigger(_req, res, next) {
  try {
    const result = await sanctionService.autoTriggerSanctions();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listFlagged(_req, res, next) {
  try {
    const result = await sanctionService.getFlaggedStudents();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function getChanges(req, res, next) {
  try {
    const changes = await sanctionService.getSanctionChanges(req.params.id);
    res.json({ data: changes });
  } catch (err) {
    next(err);
  }
}

async function exportAll(req, res, next) {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;
    if (req.query.search) filters.search = req.query.search;
    if (req.query.type) filters.type = req.query.type;
    const rows = await sanctionService.exportSanctions(filters);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRules, getRule, createRule, updateRule, removeRule, listAll, getById, summary, create, update, runAutoTrigger, listFlagged, getChanges, exportAll };
