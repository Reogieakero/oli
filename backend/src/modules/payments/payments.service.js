const prisma = require('../../config/database');
const { NotFoundError, ConflictError } = require('../../utils/errors');

async function listPaymentMethods() {
  return prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } });
}

async function createPaymentMethod(userId, data) {
  const faculty = await prisma.faculty.findUnique({ where: { userId } });
  if (!faculty) throw new NotFoundError('Faculty profile not found');
  return prisma.paymentMethod.create({
    data: {
      name: data.name,
      accountName: data.accountName || null,
      accountNumber: data.accountNumber || null,
      instructions: data.instructions || null,
      facultyId: faculty.id,
    },
  });
}

async function updatePaymentMethod(id, data) {
  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!method) throw new NotFoundError('Payment method not found');

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.accountName !== undefined) updateData.accountName = data.accountName || null;
  if (data.accountNumber !== undefined) updateData.accountNumber = data.accountNumber || null;
  if (data.instructions !== undefined) updateData.instructions = data.instructions || null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return prisma.paymentMethod.update({ where: { id }, data: updateData });
}

async function deletePaymentMethod(id) {
  const method = await prisma.paymentMethod.findUnique({
    where: { id },
    include: { payments: { select: { id: true } } },
  });
  if (!method) throw new NotFoundError('Payment method not found');
  if (method.payments.length > 0) {
    // Soft-deactivate instead of delete
    return prisma.paymentMethod.update({ where: { id }, data: { isActive: false } });
  }
  await prisma.paymentMethod.delete({ where: { id } });
}

async function recordPayment(userId, data) {
  const faculty = await prisma.faculty.findUnique({ where: { userId } });
  if (!faculty) throw new NotFoundError('Faculty profile not found');

  const balance = await prisma.balance.findUnique({ where: { id: data.balanceId } });
  if (!balance) throw new NotFoundError('Balance not found');

  const method = await prisma.paymentMethod.findUnique({ where: { id: data.paymentMethodId } });
  if (!method) throw new NotFoundError('Payment method not found');

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        balanceId: data.balanceId,
        paymentMethodId: data.paymentMethodId,
        amount: data.amount,
        referenceNo: data.referenceNo || null,
        recordedBy: faculty.id,
        notes: data.notes || null,
      },
    });

    const aggregation = await tx.payment.aggregate({
      where: { balanceId: data.balanceId },
      _sum: { amount: true },
    });

    const totalPaid = aggregation._sum.amount || 0;
    let status = 'unpaid';
    if (totalPaid >= balance.amount) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    await tx.balance.update({
      where: { id: data.balanceId },
      data: { status },
    });

    return payment;
  });
}

module.exports = { listPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod, recordPayment };
