const studentService = require('./students.service');

async function listStudents(_req, res, next) {
  try {
    const result = await studentService.listStudents();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listStudents };
