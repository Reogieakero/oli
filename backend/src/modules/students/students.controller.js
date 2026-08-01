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

async function getProfile(req, res, next) {
  try {
    const result = await studentService.getProfile(req.user.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const result = await studentService.updateProfile(req.user.sub, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function regenerateQr(req, res, next) {
  try {
    const result = await studentService.regenerateQr(req.user.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file uploaded', statusCode: 400 } });
    }
    const result = await studentService.uploadAvatar(req.user.sub, req.file);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getAvatarUrl(req, res, next) {
  try {
    const url = await studentService.getAvatarUrl(req.params.fileUrl);
    if (!url) return res.status(404).json({ error: { message: 'File not found', statusCode: 404 } });
    res.json({ signedUrl: url });
  } catch (err) {
    next(err);
  }
}

module.exports = { listStudents, completeProfile, getProfile, updateProfile, regenerateQr, uploadAvatar, getAvatarUrl };
