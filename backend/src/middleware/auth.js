const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/database');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

const SUSPENDED_MESSAGE = 'Your account has been suspended by the faculty. Please approach the faculty officers for assistance.';

async function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, env.supabaseJwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expired'));
    }
    return next(new UnauthorizedError('Invalid token'));
  }

  req.user = {
    sub: decoded.sub,
    role: decoded.app_role,
    email: decoded.email,
  };

  if (decoded.app_role === 'student') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { isSuspended: true },
      });
      if (user?.isSuspended) {
        return next(new ForbiddenError(SUSPENDED_MESSAGE));
      }
    } catch (err) {
      return next(err);
    }
  }

  next();
}

function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
