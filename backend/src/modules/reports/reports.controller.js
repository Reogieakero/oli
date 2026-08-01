const reportService = require('./reports.service');

async function byEvent(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await reportService.attendanceByEvent(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function byCourse(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await reportService.attendanceByCourse(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function dashboard(_req, res, next) {
  try {
    const result = await reportService.dashboard();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function balanceReport(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startDate = req.query.startDate || undefined;
    const endDate = req.query.endDate || undefined;
    const courseId = req.query.courseId || undefined;
    const status = req.query.status || undefined;
    const result = await reportService.balanceReport(startDate, endDate, courseId, status, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function sanctionReport(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startDate = req.query.startDate || undefined;
    const endDate = req.query.endDate || undefined;
    const type = req.query.type || undefined;
    const courseId = req.query.courseId || undefined;
    const status = req.query.status || undefined;
    const result = await reportService.sanctionReport(startDate, endDate, type, courseId, status, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { byEvent, byCourse, dashboard, balanceReport, sanctionReport };
