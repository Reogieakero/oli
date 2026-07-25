const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        statusCode: 400,
        details: err.errors,
      },
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      error: {
        message: 'Resource already exists',
        statusCode: 409,
      },
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: {
        message: 'Resource not found',
        statusCode: 404,
      },
    });
  }

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    route: req.originalUrl,
  });

  res.status(500).json({
    error: {
      message: `Internal server error: ${err.message}`,
      statusCode: 500,
    },
  });
}

module.exports = errorHandler;
