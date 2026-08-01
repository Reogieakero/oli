const paymentService = require('./payments.service');

async function listMethods(_req, res, next) {
  try {
    const methods = await paymentService.listPaymentMethods();
    res.json({ data: methods });
  } catch (err) {
    next(err);
  }
}

async function createMethod(req, res, next) {
  try {
    const method = await paymentService.createPaymentMethod(req.user.sub, req.parsed.body);
    res.status(201).json(method);
  } catch (err) {
    next(err);
  }
}

async function updateMethod(req, res, next) {
  try {
    const method = await paymentService.updatePaymentMethod(req.params.id, req.parsed.body);
    res.json(method);
  } catch (err) {
    next(err);
  }
}

async function removeMethod(req, res, next) {
  try {
    await paymentService.deletePaymentMethod(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const payment = await paymentService.recordPayment(req.user.sub, req.parsed.body, req.file);
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
}

async function listPending(req, res, next) {
  try {
    const payments = await paymentService.listPendingPayments();
    res.json({ data: payments });
  } catch (err) {
    next(err);
  }
}

async function listAll(req, res, next) {
  try {
    const payments = await paymentService.listAllPayments();
    res.json({ data: payments });
  } catch (err) {
    next(err);
  }
}

async function revert(req, res, next) {
  try {
    const result = await paymentService.revertPayment(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listMy(req, res, next) {
  try {
    const payments = await paymentService.listMyPayments(req.user.sub);
    res.json({ data: payments });
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const result = await paymentService.approvePayment(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function reject(req, res, next) {
  try {
    const result = await paymentService.rejectPayment(req.params.id, req.body.adminNotes || null);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getReceiptUrl(req, res, next) {
  try {
    const url = await paymentService.getReceiptUrl(req.params.fileUrl);
    if (!url) return res.status(404).json({ error: { message: 'File not found', statusCode: 404 } });
    res.json({ signedUrl: url });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMethods, createMethod, updateMethod, removeMethod, create, listPending, listAll, listMy, approve, reject, revert, getReceiptUrl };
