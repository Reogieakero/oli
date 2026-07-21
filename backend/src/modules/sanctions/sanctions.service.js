const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');

async function listSanctionRules() {
  return prisma.sanctionRule.findMany({
    orderBy: { absenceThreshold: 'asc' },
  });
}

async function getSanctionRule(id) {
  const rule = await prisma.sanctionRule.findUnique({ where: { id } });
  if (!rule) throw new NotFoundError('Sanction rule not found');
  return rule;
}

async function createSanctionRule(data) {
  return prisma.sanctionRule.create({ data });
}

async function updateSanctionRule(id, data) {
  const existing = await prisma.sanctionRule.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Sanction rule not found');
  return prisma.sanctionRule.update({ where: { id }, data });
}

async function deleteSanctionRule(id) {
  const existing = await prisma.sanctionRule.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Sanction rule not found');
  await prisma.sanctionRule.delete({ where: { id } });
}

async function listSanctions(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.sanction.findMany({
      skip,
      take: limit,
      orderBy: { triggeredAt: 'desc' },
      include: {
        student: { select: { firstName: true, lastName: true, studentId: true } },
        sanctionRule: { select: { sanctionLevel: true, absenceThreshold: true } },
      },
    }),
    prisma.sanction.count(),
  ]);
  return { data, total, page, limit };
}

module.exports = {
  listSanctionRules,
  getSanctionRule,
  createSanctionRule,
  updateSanctionRule,
  deleteSanctionRule,
  listSanctions,
};
