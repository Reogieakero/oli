const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');

async function listBalances(user, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  let where = {};

  if (user.role === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: user.sub } });
    if (student) where.studentId = student.id;
  }

  const [data, total] = await Promise.all([
    prisma.balance.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { firstName: true, lastName: true, studentId: true } },
        payments: { include: { paymentMethod: { select: { name: true } } } },
      },
    }),
    prisma.balance.count({ where }),
  ]);

  return { data, total, page, limit };
}

async function getBalance(id) {
  const balance = await prisma.balance.findUnique({
    where: { id },
    include: {
      student: { select: { firstName: true, lastName: true, studentId: true } },
      payments: { include: { paymentMethod: { select: { name: true } } } },
    },
  });
  if (!balance) throw new NotFoundError('Balance not found');
  return balance;
}

async function createBalance(data) {
  const student = await prisma.student.findUnique({ where: { id: data.studentId } });
  if (!student) throw new NotFoundError('Student not found');

  return prisma.balance.create({
    data: {
      studentId: data.studentId,
      description: data.description,
      amount: data.amount,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });
}

module.exports = { listBalances, getBalance, createBalance };
