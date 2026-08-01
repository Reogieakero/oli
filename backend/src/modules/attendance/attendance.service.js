const prisma = require('../../config/database');
const { NotFoundError, ValidationError, ConflictError } = require('../../utils/errors');

function toLocalDateStr(d) {
  if (!(d instanceof Date)) return d;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toLocalTimeStr(d) {
  if (!(d instanceof Date)) return d;
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatRecordDates(record) {
  if (record.event) {
    record.event = {
      ...record.event,
      eventDate: toLocalDateStr(record.event.eventDate),
      startTime: toLocalTimeStr(record.event.startTime),
    };
  }
  return record;
}

async function validatePasscode(passcode, opts = {}) {
  const event = await prisma.event.findUnique({
    where: { programPasscode: passcode },
    select: {
      id: true,
      title: true,
      venue: true,
      courseId: true,
      targetYearLevel: true,
      isActive: true,
      passcodeExpiresAt: true,
      lateCutoffTime: true,
      eventDate: true,
      startTime: true,
      endTime: true,
    },
  });

  if (!event) throw new NotFoundError('Invalid passcode');

  if (!opts.allowExpired) {
    if (!event.isActive) throw new ValidationError('Event is not active');
    if (event.passcodeExpiresAt && new Date() > event.passcodeExpiresAt) {
      throw new ValidationError('Passcode has expired');
    }
  }

  return event;
}

async function activateEvent(passcode) {
  const event = await validatePasscode(passcode);

  const students = await prisma.student.findMany({
    where: {
      ...(event.courseId ? { courseId: event.courseId } : {}),
      ...(event.targetYearLevel ? { yearLevel: event.targetYearLevel } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      studentId: true,
      qrCodeToken: true,
    },
  });

  return {
    eventId: event.id,
    title: event.title,
    venue: event.venue,
    eventDate: toLocalDateStr(event.eventDate),
    startTime: toLocalTimeStr(event.startTime),
    endTime: toLocalTimeStr(event.endTime),
    lateCutoffTime: event.lateCutoffTime,
    valid: true,
    students,
  };
}

async function scanAttendance(passcode, qrCodeToken, scannerDeviceId, scannedAt) {
  const event = await validatePasscode(passcode, { allowExpired: Boolean(scannedAt) });

  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { qrCodeToken },
    });

    if (!student) throw new NotFoundError('Invalid QR code — student not found');

    const scanTime = scannedAt ? new Date(scannedAt) : new Date();
    const eventDateStr = toLocalDateStr(event.eventDate);
    const startTimeStr = toLocalTimeStr(event.startTime);
    const endTimeStr = toLocalTimeStr(event.endTime);
    const eventStart = new Date(`${eventDateStr}T${startTimeStr}`);
    const eventEnd = new Date(`${eventDateStr}T${endTimeStr}`);

    if (scanTime < eventStart) {
      throw new ValidationError('Event has not started yet');
    }
    if (scanTime > eventEnd) {
      throw new ValidationError('Event has already ended');
    }

    const existing = await tx.attendanceRecord.findUnique({
      where: {
        uq_attendance_event_student: {
          studentId: student.id,
          eventId: event.id,
        },
      },
    });

    if (existing && (existing.status === 'present' || existing.status === 'late')) {
      throw new ConflictError('Attendance already recorded for this event');
    }

    const cutoffMs = event.lateCutoffTime * 60 * 1000;
    const isLate = (scanTime.getTime() - eventStart.getTime()) > cutoffMs;

    const updated = existing
      ? await tx.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            status: isLate ? 'late' : 'present',
            scannedAt: scanTime,
            scanMethod: 'qr_scan',
            scannerDeviceId: scannerDeviceId || null,
          },
        })
      : await tx.attendanceRecord.create({
          data: {
            studentId: student.id,
            eventId: event.id,
            status: isLate ? 'late' : 'present',
            scannedAt: scanTime,
            scanMethod: 'qr_scan',
            scannerDeviceId: scannerDeviceId || null,
          },
        });

    const absenceCount = await tx.attendanceRecord.count({
      where: {
        studentId: student.id,
        status: 'absent',
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

  return { data: data.map(formatRecordDates), total, page, limit };
}

const DEFAULT_ABSENCE_RULES = [
  { absenceThreshold: 1, sanctionLevel: 'Written Warning' },
  { absenceThreshold: 2, sanctionLevel: 'Final Written Warning' },
  { absenceThreshold: 3, sanctionLevel: '1-Day Suspension' },
  { absenceThreshold: 4, sanctionLevel: '3-Day Suspension' },
  { absenceThreshold: 5, sanctionLevel: '5-Day Suspension' },
  { absenceThreshold: 6, sanctionLevel: '7-Day Suspension' },
  { absenceThreshold: 7, sanctionLevel: 'Expulsion' },
];

const DEFAULT_LATE_RULES = [
  { absenceThreshold: 1, sanctionLevel: 'Late Warning' },
  { absenceThreshold: 2, sanctionLevel: 'Late Final Warning' },
  { absenceThreshold: 3, sanctionLevel: 'Late Detention' },
  { absenceThreshold: 4, sanctionLevel: 'Late Suspension' },
  { absenceThreshold: 5, sanctionLevel: 'Late Extended Suspension' },
  { absenceThreshold: 6, sanctionLevel: 'Late Probation' },
  { absenceThreshold: 7, sanctionLevel: 'Late Expulsion' },
];

function computeSanctionStatus(count, rules) {
  const bestRule = rules
    .filter(r => count >= r.absenceThreshold)
    .sort((a, b) => b.absenceThreshold - a.absenceThreshold)[0] || null;

  const nextRule = rules.find(r => r.absenceThreshold > count) || null;

  return {
    active: bestRule ? {
      threshold: bestRule.absenceThreshold,
      level: bestRule.sanctionLevel,
    } : null,
    next: nextRule ? {
      atCount: nextRule.absenceThreshold,
      level: nextRule.sanctionLevel,
      remaining: nextRule.absenceThreshold - count,
    } : null,
  };
}

async function getSanctionStatus(userId) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new NotFoundError('Student not found');

  const [absenceCount, lateCount, dbRules] = await Promise.all([
    prisma.attendanceRecord.count({
      where: {
        studentId: student.id,
        status: 'absent',
      },
    }),
    prisma.attendanceRecord.count({
      where: {
        studentId: student.id,
        status: 'late',
      },
    }),
    prisma.sanctionRule.findMany({
      where: { isActive: true },
      orderBy: { absenceThreshold: 'asc' },
    }),
  ]);

  const absenceRules = dbRules.filter(r => r.type === 'absence');
  const lateRules = dbRules.filter(r => r.type === 'late');

  const absence = computeSanctionStatus(absenceCount, absenceRules.length > 0 ? absenceRules : DEFAULT_ABSENCE_RULES);
  const late = computeSanctionStatus(lateCount, lateRules.length > 0 ? lateRules : DEFAULT_LATE_RULES);

  return {
    absenceCount,
    lateCount,
    activeSanctions: [
      ...(absence.active ? [{ type: 'absence', count: absenceCount, ...absence.active }] : []),
      ...(late.active ? [{ type: 'late', count: lateCount, ...late.active }] : []),
    ],
    nextSanctionThresholds: [
      ...(absence.next ? [{ type: 'absence', count: absenceCount, ...absence.next }] : []),
      ...(late.next ? [{ type: 'late', count: lateCount, ...late.next }] : []),
    ],
    activeSanction: absence.active ? { id: null, level: absence.active.level, triggeredAt: null } : null,
    nextSanctionThreshold: absence.next ? {
      atAbsences: absence.next.atCount,
      level: absence.next.level,
      absencesRemaining: absence.next.remaining,
    } : null,
  };
}

module.exports = {
  validatePasscode,
  activateEvent,
  scanAttendance,
  getStudentHistory,
  getSanctionStatus,
};
