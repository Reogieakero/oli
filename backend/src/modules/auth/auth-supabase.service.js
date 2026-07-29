const crypto = require('crypto');
const prisma = require('../../config/database');
const supabase = require('../../config/supabase');
const { generateTokens } = require('./auth.service');

async function exchangeSupabaseToken(supabaseAccessToken) {
  const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(supabaseAccessToken);

  if (error || !supabaseUser) {
    throw new Error('Invalid or expired Supabase token');
  }

  const email = supabaseUser.email;
  const googleId = supabaseUser.id;

  const existingByGoogleId = await prisma.user.findUnique({
    where: { googleId },
    include: { student: true },
  });
  if (existingByGoogleId) {
    const tokens = generateTokens(existingByGoogleId);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      needsProfile: existingByGoogleId.needsProfile,
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
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      needsProfile: updated.needsProfile,
    };
  }

  const qrCodeToken = crypto.randomBytes(32).toString('hex');

  const user = await prisma.user.create({
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

  const tokens = generateTokens(user);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    needsProfile: user.needsProfile,
  };
}

module.exports = { exchangeSupabaseToken };
