const studentService = require('./students.service');

async function listStudents(req, res, next) {
  try {
    const result = await studentService.listStudents(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function completeProfile(req, res, next) {
  try {
    const result = await studentService.completeProfile(req.user.sub, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listStudents, completeProfile };
