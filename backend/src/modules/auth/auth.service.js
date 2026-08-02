const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const prisma = require('../../config/database');
const env = require('../../config/env');
const { ConflictError, UnauthorizedError, NotFoundError, ForbiddenError } = require('../../utils/errors');

const SUSPENDED_MESSAGE = 'Your account has been suspended by the faculty. Please approach the faculty officers for assistance.';

function assertNotSuspended(user) {
  if (user.isSuspended) {
    throw new ForbiddenError(SUSPENDED_MESSAGE);
  }
}

function generateTokens(user) {
  const accessToken = jwt.sign(
    {
      sub: user.id,
      role: 'authenticated',
      app_role: user.role,
      email: user.email,
    },
    env.supabaseJwtSecret,
    { expiresIn: env.jwtAccessExpiry }
  );

  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    env.supabaseJwtSecret,
    { expiresIn: env.jwtRefreshExpiry }
  );

  return { accessToken, refreshToken };
}

async function registerStudent(data) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const existingStudentId = await prisma.student.findUnique({
    where: { studentId: data.studentId },
  });
  if (existingStudentId) {
    throw new ConflictError('Student ID already exists');
  }

  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const qrCodeToken = crypto.randomBytes(32).toString('hex');

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: 'student',
        student: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            studentId: data.studentId,
            courseId: data.courseId,
            yearLevel: data.yearLevel,
            qrCodeToken,
          },
        },
      },
      include: { student: true },
    });
    return newUser;
  });

  const tokens = generateTokens(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      student: user.student,
    },
    ...tokens,
  };
}

async function loginStudent(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { student: true },
  });

  if (!user || user.role !== 'student') {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  assertNotSuspended(user);

  const tokens = generateTokens(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      student: user.student,
    },
    ...tokens,
  };
}

async function loginFaculty(email, password) {
  if (email !== env.facultyEmail || password !== env.facultyPassword) {
    throw new UnauthorizedError('Invalid faculty credentials');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { faculty: true },
  });

  if (!user || user.role !== 'faculty') {
    throw new UnauthorizedError('Faculty account not found');
  }

  const tokens = generateTokens(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      faculty: user.faculty,
    },
    ...tokens,
  };
}

async function refreshAccessToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, env.supabaseJwtSecret);
    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    assertNotSuspended(user);

    const tokens = generateTokens(user);
    return { accessToken: tokens.accessToken };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

module.exports = {
  generateTokens,
  registerStudent,
  loginStudent,
  loginFaculty,
  refreshAccessToken,
  assertNotSuspended,
  SUSPENDED_MESSAGE,
};
