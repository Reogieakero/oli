const app = require('./app');
const prisma = require('./config/database');
const env = require('./config/env');
const logger = require('./utils/logger');
const { applyRLS } = require('./db/rls');

async function main() {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    await applyRLS();
    logger.info('RLS policies applied');

    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main();
