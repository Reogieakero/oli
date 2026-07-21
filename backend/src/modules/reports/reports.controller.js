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

async function byCourse(_req, res, next) {
  try {
    const result = await reportService.attendanceByCourse();
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

module.exports = { byEvent, byCourse, dashboard };
