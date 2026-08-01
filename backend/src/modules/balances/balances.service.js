const prisma = require('../../config/database');
const { NotFoundError, ConflictError } = require('../../utils/errors');

async function listBalances(user, page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  let where = {};

  if (user.role === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: user.sub } });
    if (student) where.studentId = student.id;
  }

  if (filters.status === 'overdue') {
    where.status = { not: 'paid' };
    where.dueDate = { lt: new Date() };
  } else if (filters.status) {
    where.status = filters.status;
  }
  if (filters.courseId) where.student = { ...where.student, courseId: filters.courseId };

  if (filters.search) {
    const q = filters.search;
    where.OR = [
      { student: { firstName: { contains: q, mode: 'insensitive' } } },
      { student: { lastName: { contains: q, mode: 'insensitive' } } },
      { student: { studentId: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const orderBy = {};
  const sortOrder = filters.sortOrder || 'asc';
  if (filters.sortBy === 'studentName') {
    orderBy.student = { firstName: sortOrder };
  } else if (filters.sortBy === 'studentId') {
    orderBy.student = { studentId: sortOrder };
  } else if (filters.sortBy === 'course') {
    orderBy.student = { course: { name: sortOrder } };
  } else if (filters.sortBy === 'totalPaid') {
    // Can't sort by computed field via Prisma; fallback
    orderBy.createdAt = 'desc';
  } else if (filters.sortBy) {
    orderBy[filters.sortBy] = sortOrder;
  } else {
    orderBy.createdAt = 'desc';
  }

  const [data, total, summary] = await Promise.all([
    prisma.balance.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentId: true, course: { select: { id: true, code: true, name: true } } } },
        payments: {
          select: { id: true, amount: true, status: true, referenceNo: true, paidAt: true, notes: true, paymentMethod: { select: { name: true } } },
          orderBy: { paidAt: 'desc' },
        },
      },
    }),
    prisma.balance.count({ where }),
    prisma.balance.findMany({
      where: { status: { in: ['unpaid', 'partial'] } },
      select: {
        amount: true,
        payments: { where: { status: 'approved' }, select: { amount: true } },
      },
    }),
  ]);

  const netOutstanding = summary.reduce(
    (sum, b) => sum + (Number(b.amount) - b.payments.reduce((s, p) => s + Number(p.amount), 0)),
    0,
  );

  const [unpaidCount, partialCount, paidCount, overdueCount] = await Promise.all([
    prisma.balance.count({ where: { ...where, status: 'unpaid' } }),
    prisma.balance.count({ where: { ...where, status: 'partial' } }),
    prisma.balance.count({ where: { ...where, status: 'paid' } }),
    prisma.balance.count({ where: { ...where, status: { not: 'paid' }, dueDate: { lt: new Date() } } }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    summary: {
      totalOutstanding: Math.max(0, netOutstanding),
      unpaid: unpaidCount,
      partial: partialCount,
      paid: paidCount,
      overdue: overdueCount,
    },
  };
}

async function getBalance(id) {
  const balance = await prisma.balance.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, studentId: true, course: { select: { id: true, code: true, name: true } } } },
      payments: {
        select: { id: true, amount: true, status: true, referenceNo: true, paidAt: true, notes: true, paymentMethod: { select: { name: true } }, recordedBy: true },
        orderBy: { paidAt: 'desc' },
      },
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
    include: {
      student: { select: { id: true, firstName: true, lastName: true, studentId: true, course: { select: { id: true, code: true, name: true } } } },
    },
  });
}

async function updateBalance(id, data) {
  const balance = await prisma.balance.findUnique({
    where: { id },
    include: { payments: { select: { amount: true } } },
  });
  if (!balance) throw new NotFoundError('Balance not found');

  const updateData = {};
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;

  // If amount changed, recalculate status from existing payments, unless status is explicitly provided
  if (data.status !== undefined) {
    updateData.status = data.status;
  } else if (data.amount !== undefined) {
    const totalPaid = balance.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (totalPaid >= data.amount) {
      updateData.status = 'paid';
    } else if (totalPaid > 0) {
      updateData.status = 'partial';
    } else {
      updateData.status = 'unpaid';
    }
  }

  return prisma.balance.update({
    where: { id },
    data: updateData,
    include: {
      student: { select: { id: true, firstName: true, lastName: true, studentId: true, course: { select: { id: true, code: true, name: true } } } },
      payments: {
        select: { id: true, amount: true, referenceNo: true, paidAt: true, notes: true, paymentMethod: { select: { name: true } } },
        orderBy: { paidAt: 'desc' },
      },
    },
  });
}

async function createBalancesBulk(data) {
  const { description, amount, dueDate, courseId } = data;

  const where = courseId ? { courseId } : {};
  const students = await prisma.student.findMany({ where, select: { id: true } });

  if (students.length === 0) {
    throw new NotFoundError(courseId ? 'No students found in this course' : 'No students found');
  }

  // Find existing balances with same description to skip duplicates
  const existing = await prisma.balance.findMany({
    where: { description, studentId: { in: students.map((s) => s.id) } },
    select: { studentId: true },
  });
  const existingIds = new Set(existing.map((b) => b.studentId));

  const toCreate = students
    .filter((s) => !existingIds.has(s.id))
    .map((s) => ({
      studentId: s.id,
      description,
      amount,
      dueDate: dueDate ? new Date(dueDate) : null,
    }));

  if (toCreate.length === 0) {
    return { created: 0, skipped: students.length };
  }

  const batchSize = 50;
  let created = 0;
  for (let i = 0; i < toCreate.length; i += batchSize) {
    await prisma.balance.createMany({ data: toCreate.slice(i, i + batchSize) });
    created += Math.min(batchSize, toCreate.length - i);
  }

  return { created, skipped: existingIds.size };
}

async function deleteBalance(id) {
  const balance = await prisma.balance.findUnique({
    where: { id },
    include: { payments: { select: { id: true } } },
  });
  if (!balance) throw new NotFoundError('Balance not found');
  if (balance.payments.length > 0) {
    throw new ConflictError('Cannot delete balance with existing payments. Reverse the payments first.');
  }

  await prisma.balance.delete({ where: { id } });
}

module.exports = { listBalances, getBalance, createBalance, updateBalance, deleteBalance, createBalancesBulk };
