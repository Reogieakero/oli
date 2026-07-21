const authService = require('./auth.service');

async function register(req, res, next) {
  try {
    const result = await authService.registerStudent(req.parsed.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.parsed.body;
    const result = await authService.loginStudent(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function loginFacultyHandler(req, res, next) {
  try {
    const { email, password } = req.parsed.body;
    const result = await authService.loginFaculty(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refreshAccessToken(req.parsed.body.refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, loginFacultyHandler, refresh };
