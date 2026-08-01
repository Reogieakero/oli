const prisma = require('../../config/database');
const supabase = require('../../config/supabase');
const { NotFoundError } = require('../../utils/errors');

const RECEIPT_BUCKET = 'payment-receipts';

async function ensureReceiptBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === RECEIPT_BUCKET)) {
    await supabase.storage.createBucket(RECEIPT_BUCKET, { public: false });
  }
}

async function getReceiptUrl(fileUrl) {
  const { data } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(fileUrl, 3600);
  return data?.signedUrl || null;
}

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
    return prisma.paymentMethod.update({ where: { id }, data: { isActive: false } });
  }
  await prisma.paymentMethod.delete({ where: { id } });
}

async function recordPayment(userId, data, file) {
  const balance = await prisma.balance.findUnique({ where: { id: data.balanceId } });
  if (!balance) throw new NotFoundError('Balance not found');

  const method = await prisma.paymentMethod.findUnique({ where: { id: data.paymentMethodId } });
  if (!method) throw new NotFoundError('Payment method not found');

  const faculty = await prisma.faculty.findUnique({ where: { userId } });
  let proofReceipt = data.proofReceipt || null;

  if (file) {
    await ensureReceiptBucket();
    const ext = (file.originalname.match(/\.([^.]+)$/) || [])[1] || 'bin';
    const filePath = `receipts/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .upload(filePath, file.buffer, { contentType: file.mimetype });
    if (uploadError) throw new Error(`Receipt upload failed: ${uploadError.message}`);
    proofReceipt = filePath;
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        balanceId: data.balanceId,
        paymentMethodId: data.paymentMethodId,
        amount: data.amount,
        referenceNo: data.referenceNo || null,
        proofReceipt,
        status: faculty ? 'approved' : 'pending',
        recordedBy: faculty ? faculty.id : null,
        notes: data.notes || null,
      },
    });

    if (faculty) {
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
    }

    return payment;
  });
}

async function listPendingPayments() {
  return prisma.payment.findMany({
    where: { status: 'pending' },
    include: {
      paymentMethod: { select: { name: true } },
      balance: {
        include: {
          student: {
            include: { course: { select: { code: true, name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function listMyPayments(userId) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new NotFoundError('Student profile not found');

  return prisma.payment.findMany({
    where: { balance: { studentId: student.id } },
    include: {
      paymentMethod: { select: { name: true } },
      balance: { select: { description: true, amount: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function approvePayment(paymentId) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { balance: true },
    });
    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.status !== 'pending') throw new Error('Payment is not pending');

    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'approved' },
    });

    const aggregation = await tx.payment.aggregate({
      where: { balanceId: payment.balanceId, status: 'approved' },
      _sum: { amount: true },
    });

    const totalPaid = aggregation._sum.amount || 0;
    let status = 'unpaid';
    if (totalPaid >= payment.balance.amount) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    await tx.balance.update({
      where: { id: payment.balanceId },
      data: { status },
    });

    return { id: paymentId, status: 'approved' };
  });
}

async function rejectPayment(paymentId, adminNotes) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new NotFoundError('Payment not found');
  if (payment.status !== 'pending') throw new Error('Payment is not pending');

  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'rejected', adminNotes: adminNotes || null },
  });
}

async function listAllPayments() {
  return prisma.payment.findMany({
    include: {
      paymentMethod: { select: { name: true } },
      balance: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true, studentId: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function revertPayment(paymentId) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new NotFoundError('Payment not found');
  if (payment.status === 'pending') throw new Error('Payment is already pending');

  return prisma.$transaction(async (tx) => {
    const balance = await tx.balance.findUnique({ where: { id: payment.balanceId } });

    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'pending', adminNotes: null },
    });

    const aggregation = await tx.payment.aggregate({
      where: { balanceId: payment.balanceId, status: 'approved' },
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
      where: { id: payment.balanceId },
      data: { status },
    });

    return { id: paymentId, status: 'pending' };
  });
}

module.exports = {
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  recordPayment,
  listPendingPayments,
  approvePayment,
  rejectPayment,
  listMyPayments,
  listAllPayments,
  revertPayment,
  getReceiptUrl,
};
