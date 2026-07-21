const prisma = require('../../config/database');
const { NotFoundError, ValidationError, ConflictError } = require('../../utils/errors');

async function validatePasscode(passcode) {
  const event = await prisma.event.findUnique({
    where: { programPasscode: passcode },
    select: {
      id: true,
      title: true,
      isActive: true,
      passcodeExpiresAt: true,
      lateCutoffTime: true,
      eventDate: true,
      startTime: true,
    },
  });

  if (!event) throw new NotFoundError('Invalid passcode');
  if (!event.isActive) throw new ValidationError('Event is not active');
  if (event.passcodeExpiresAt && new Date() > event.passcodeExpiresAt) {
    throw new ValidationError('Passcode has expired');
  }

  return event;
}

async function scanAttendance(passcode, qrCodeToken, scannerDeviceId) {
  const event = await validatePasscode(passcode);

  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { qrCodeToken },
    });

    if (!student) throw new NotFoundError('Invalid QR code — student not found');

    const record = await tx.attendanceRecord.findUnique({
      where: {
        uq_attendance_event_student: {
          studentId: student.id,
          eventId: event.id,
        },
      },
    });

    if (!record) throw new NotFoundError('No attendance record found for this event');
    if (record.status === 'present' || record.status === 'late') {
      throw new ConflictError('Attendance already recorded for this event');
    }

    const now = new Date();
    const eventDateStr = event.eventDate.toISOString().split('T')[0];
    const startTimeStr = event.startTime.toISOString().substring(11, 19);
    const eventStart = new Date(`${eventDateStr}T${startTimeStr}`);
    const cutoffMs = event.lateCutoffTime * 60 * 1000;
    const isLate = (now.getTime() - eventStart.getTime()) > cutoffMs;

    const updated = await tx.attendanceRecord.update({
      where: { id: record.id },
      data: {
        status: isLate ? 'late' : 'present',
        scannedAt: now,
        scanMethod: 'qr_scan',
        scannerDeviceId: scannerDeviceId || null,
      },
    });

    const absenceCount = await tx.attendanceRecord.count({
      where: {
        studentId: student.id,
        status: 'absent',
        event: { isMandatory: true },
      },
    });

    const sanctionRule = await tx.sanctionRule.findFirst({
      where: {
        absenceThreshold: { lte: absenceCount },
        isActive: true,
      },
      orderBy: { absenceThreshold: 'desc' },
    });

    let sanction = null;
    if (sanctionRule) {
      const activeSanctions = await tx.sanction.findMany({
        where: { studentId: student.id, status: 'active' },
      });

      for (const s of activeSanctions) {
        await tx.sanction.update({
          where: { id: s.id },
          data: { status: 'superseded' },
        });
      }

      const newSanction = await tx.sanction.create({
        data: {
          studentId: student.id,
          sanctionRuleId: sanctionRule.id,
          notes: `Absence count: ${absenceCount}`,
        },
      });
      sanction = newSanction;
    }

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        studentId: student.studentId,
      },
      status: updated.status,
      scannedAt: updated.scannedAt,
      absenceCount,
      sanction: sanction ? { id: sanction.id, level: sanctionRule.sanctionLevel } : null,
    };
  });

  return result;
}

async function getStudentHistory(userId, page = 1, limit = 20) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new NotFoundError('Student not found');

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { studentId: student.id },
      skip,
      take: limit,
      orderBy: { event: { eventDate: 'desc' } },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            startTime: true,
            venue: true,
            isMandatory: true,
          },
        },
        dispute: {
          select: { id: true, status: true },
        },
      },
    }),
    prisma.attendanceRecord.count({ where: { studentId: student.id } }),
  ]);

  return { data, total, page, limit };
}

async function getSanctionStatus(userId) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new NotFoundError('Student not found');

  const absenceCount = await prisma.attendanceRecord.count({
    where: {
      studentId: student.id,
      status: 'absent',
      event: { isMandatory: true },
    },
  });

  const activeSanction = await prisma.sanction.findFirst({
    where: { studentId: student.id, status: 'active' },
    include: { sanctionRule: true },
    orderBy: { triggeredAt: 'desc' },
  });

  const sanctionRules = await prisma.sanctionRule.findMany({
    where: { isActive: true },
    orderBy: { absenceThreshold: 'asc' },
  });

  const nextThreshold = sanctionRules.find(r => r.absenceThreshold > absenceCount);

  return {
    absenceCount,
    activeSanction: activeSanction ? {
      id: activeSanction.id,
      level: activeSanction.sanctionRule.sanctionLevel,
      triggeredAt: activeSanction.triggeredAt,
    } : null,
    nextSanctionThreshold: nextThreshold ? {
      atAbsences: nextThreshold.absenceThreshold,
      level: nextThreshold.sanctionLevel,
      absencesRemaining: nextThreshold.absenceThreshold - absenceCount,
    } : null,
  };
}

module.exports = {
  validatePasscode,
  scanAttendance,
  getStudentHistory,
  getSanctionStatus,
};
