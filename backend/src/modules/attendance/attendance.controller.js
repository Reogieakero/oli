const attendanceService = require('./attendance.service');

async function activateSession(req, res, next) {
  try {
    const result = await attendanceService.activateEvent(req.parsed.body.passcode);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function scan(req, res, next) {
  try {
    const result = await attendanceService.scanAttendance(
      req.parsed.body.passcode,
      req.parsed.body.qrCodeToken,
      req.parsed.body.scannerDeviceId,
      req.parsed.body.scannedAt
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function history(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await attendanceService.getStudentHistory(req.user.sub, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function sanctionStatus(req, res, next) {
  try {
    const result = await attendanceService.getSanctionStatus(req.user.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { activateSession, scan, history, sanctionStatus };
