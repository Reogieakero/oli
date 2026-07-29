const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');
const env = require('../../config/env');
const { generateTokens } = require('./auth.service');

async function findOrCreateGoogleUser(profile) {
  const googleId = profile.id;
  const email = profile.emails?.[0]?.value;

  const existingByGoogleId = await prisma.user.findUnique({
    where: { googleId },
    include: { student: true },
  });
  if (existingByGoogleId) {
    const tokens = generateTokens(existingByGoogleId);
    return {
      user: {
        id: existingByGoogleId.id,
        email: existingByGoogleId.email,
        role: existingByGoogleId.role,
        needsProfile: existingByGoogleId.needsProfile,
        student: existingByGoogleId.student,
      },
      ...tokens,
      isNew: false,
    };
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
    include: { student: true },
  });
  if (existingByEmail) {
    const updated = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: { googleId },
      include: { student: true },
    });
    const tokens = generateTokens(updated);
    return {
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        needsProfile: updated.needsProfile,
        student: updated.student,
      },
      ...tokens,
      isNew: false,
    };
  }

  const qrCodeToken = crypto.randomBytes(32).toString('hex');

  const newUser = await prisma.user.create({
    data: {
      email,
      googleId,
      role: 'student',
      needsProfile: true,
      student: {
        create: {
          firstName: '',
          lastName: '',
          studentId: qrCodeToken.slice(0, 10),
          yearLevel: 1,
          qrCodeToken,
        },
      },
    },
    include: { student: true },
  });

  const user = newUser;

  const tokens = generateTokens(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      needsProfile: user.needsProfile,
      student: user.student,
    },
    ...tokens,
    isNew: true,
  };
}

module.exports = { findOrCreateGoogleUser };
