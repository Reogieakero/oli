const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');

async function listPaymentMethods() {
  return prisma.paymentMethod.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
}

async function createPaymentMethod(userId, name) {
  const faculty = await prisma.faculty.findUnique({ where: { userId } });
  if (!faculty) throw new NotFoundError('Faculty profile not found');
  return prisma.paymentMethod.create({ data: { name, facultyId: faculty.id } });
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

module.exports = { listPaymentMethods, createPaymentMethod, recordPayment };
