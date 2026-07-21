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
    const method = await paymentService.createPaymentMethod(req.user.sub, req.parsed.body.name);
    res.status(201).json(method);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const payment = await paymentService.recordPayment(req.user.sub, req.parsed.body);
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
}

module.exports = { listMethods, createMethod, create };
