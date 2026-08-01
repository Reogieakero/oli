const { seedFaculty } = require('./seed');
const { applyRLS } = require('./rls');
const prisma = require('../config/database');
const logger = require('../utils/logger');

async function main() {
  await seedFaculty();
  await applyRLS();
  await prisma.$disconnect();
  logger.info('Database setup complete');
  process.exit(0);
}

main().catch(async (err) => {
  logger.error('Database setup failed', { error: err.message });
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
