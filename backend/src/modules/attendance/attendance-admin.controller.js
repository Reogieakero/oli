const adminService = require('./attendance-admin.service');

async function listRecords(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const filters = {};

    if (req.query.eventId) filters.eventId = req.query.eventId;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.courseId) filters.courseId = req.query.courseId;
    if (req.query.eventCourseId) filters.eventCourseId = req.query.eventCourseId;
    if (req.query.fromDate) filters.fromDate = req.query.fromDate;
    if (req.query.toDate) filters.toDate = req.query.toDate;
    if (req.query.search) filters.search = req.query.search;
    if (req.query.sortBy) filters.sortBy = req.query.sortBy;
    if (req.query.sortOrder) filters.sortOrder = req.query.sortOrder;

    const result = await adminService.listRecords(page, limit, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function updateRecord(req, res, next) {
  try {
    const result = await adminService.updateRecord(
      req.params.id,
      req.user.sub,
      req.parsed.body
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createRecord(req, res, next) {
  try {
    const result = await adminService.createRecord(
      req.user.sub,
      req.parsed.body
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function deleteRecord(req, res, next) {
  try {
    await adminService.deleteRecord(req.params.id, req.user.sub);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listRecords, updateRecord, createRecord, deleteRecord };
