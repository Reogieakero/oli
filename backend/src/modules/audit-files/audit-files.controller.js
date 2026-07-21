const auditFileService = require('./audit-files.service');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await auditFileService.listAuditFiles(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const file = await auditFileService.getAuditFile(req.params.id);
    res.json(file);
  } catch (err) {
    next(err);
  }
}

async function upload(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: { message: 'No file provided', statusCode: 400 } });

    const file = await auditFileService.uploadAuditFile(req.user.sub, {
      title: req.body.title,
      description: req.body.description,
      file: req.file,
    });
    res.status(201).json(file);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await auditFileService.deleteAuditFile(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function downloadUrl(req, res, next) {
  try {
    const url = await auditFileService.getSignedUrl(req.params.fileUrl);
    if (!url) return res.status(404).json({ error: { message: 'File not found', statusCode: 404 } });
    res.json({ signedUrl: url });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, upload, remove, downloadUrl };
