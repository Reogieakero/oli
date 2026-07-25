const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const env = require('../config/env');
const logger = require('../utils/logger');

async function seedFaculty() {
  const email = env.facultyEmail;
  const password = env.facultyPassword;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.debug('Faculty account already exists, skipping seed');
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'faculty',
      faculty: {
        create: {
          fullName: 'Faculty Admin',
        },
      },
    },
    include: { faculty: true },
  });

  logger.info('Faculty account seeded', { email });
  return user;
}

module.exports = { seedFaculty };
