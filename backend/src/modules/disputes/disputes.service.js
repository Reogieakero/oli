const prisma = require('../../config/database');
const { NotFoundError, ConflictError, ForbiddenError } = require('../../utils/errors');

async function listDisputes(user, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  let where = {};

  if (user.role === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: user.sub } });
    if (student) where.studentId = student.id;
  }

  const [data, total] = await Promise.all([
    prisma.dispute.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { firstName: true, lastName: true, studentId: true } },
        attendanceRecord: { select: { status: true, event: { select: { title: true, eventDate: true } } } },
      },
    }),
    prisma.dispute.count({ where }),
  ]);

  return { data, total, page, limit };
}

async function createDispute(userId, data) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new NotFoundError('Student not found');

  const record = await prisma.attendanceRecord.findUnique({
    where: { id: data.attendanceRecordId },
  });
  if (!record) throw new NotFoundError('Attendance record not found');
  if (record.studentId !== student.id) throw new ForbiddenError('Not your attendance record');

  const existing = await prisma.dispute.findUnique({
    where: { attendanceRecordId: data.attendanceRecordId },
  });
  if (existing) throw new ConflictError('Dispute already exists for this record');

  return prisma.dispute.create({
    data: {
      attendanceRecordId: data.attendanceRecordId,
      studentId: student.id,
      reason: data.reason,
    },
  });
}

async function resolveDispute(disputeId, userId, data) {
  const faculty = await prisma.faculty.findUnique({ where: { userId } });
  if (!faculty) throw new NotFoundError('Faculty profile not found');

  return prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.findUnique({
      where: { id: disputeId },
      include: { attendanceRecord: true },
    });
    if (!dispute) throw new NotFoundError('Dispute not found');
    if (dispute.status !== 'pending') throw new ConflictError('Dispute already resolved');

    await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: data.status,
        reviewedBy: faculty.id,
        reviewedAt: new Date(),
        facultyNotes: data.facultyNotes || null,
      },
    });

    if (data.status === 'approved') {
      await tx.attendanceRecord.update({
        where: { id: dispute.attendanceRecordId },
        data: {
          status: 'present',
          scanMethod: 'manual',
        },
      });

      const absenceCount = await tx.attendanceRecord.count({
        where: {
          studentId: dispute.studentId,
          status: 'absent',
          event: { isMandatory: true },
        },
      });

      const activeSanction = await tx.sanction.findFirst({
        where: { studentId: dispute.studentId, status: 'active' },
        include: { sanctionRule: true },
      });

      if (activeSanction && absenceCount < activeSanction.sanctionRule.absenceThreshold) {
        await tx.sanction.update({
          where: { id: activeSanction.id },
          data: {
            status: 'lifted',
            resolvedAt: new Date(),
            notes: 'Dispute approved, absences below threshold',
          },
        });
      }
    }

    return tx.dispute.findUnique({
      where: { id: disputeId },
      include: {
        attendanceRecord: { select: { status: true } },
      },
    });
  });
}

module.exports = { listDisputes, createDispute, resolveDispute };
