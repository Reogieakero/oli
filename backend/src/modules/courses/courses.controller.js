const courseService = require('./courses.service');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await courseService.listCourses(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const course = await courseService.getCourse(req.params.id);
    res.json(course);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const course = await courseService.createCourse(req.parsed.body);
    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const course = await courseService.updateCourse(req.params.id, req.parsed.body);
    res.json(course);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await courseService.deleteCourse(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };
