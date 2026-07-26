const prisma = require('../../config/database');
const { NotFoundError, ConflictError, ValidationError } = require('../../utils/errors');

async function listRecords(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  const where = {};

  if (filters.eventId) where.eventId = filters.eventId;
  if (filters.status) where.status = filters.status;
  if (filters.courseId) where.student = { ...where.student, courseId: filters.courseId };
  if (filters.eventCourseId) where.event = { ...where.event, courseId: filters.eventCourseId };

  if (filters.fromDate || filters.toDate) {
    where.event = {
      ...where.event,
      eventDate: {},
    };
    if (filters.fromDate) where.event.eventDate.gte = new Date(filters.fromDate);
    if (filters.toDate) where.event.eventDate.lte = new Date(filters.toDate);
  }

  if (filters.search) {
    const q = filters.search;
    where.OR = [
      { student: { firstName: { contains: q, mode: 'insensitive' } } },
      { student: { lastName: { contains: q, mode: 'insensitive' } } },
      { student: { studentId: { contains: q, mode: 'insensitive' } } },
      { event: { title: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const orderBy = {};
  if (filters.sortBy === 'studentName') {
    orderBy.student = { firstName: filters.sortOrder || 'asc' };
  } else if (filters.sortBy) {
    orderBy[filters.sortBy] = filters.sortOrder || 'asc';
  } else {
    orderBy.createdAt = 'desc';
  }

  const [data, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
            course: { select: { id: true, code: true, name: true } },
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            startTime: true,
            venue: true,
            isMandatory: true,
            course: { select: { id: true, code: true, name: true } },
          },
        },
        dispute: {
          select: { id: true, status: true, reason: true },
        },
      },
    }),
    prisma.attendanceRecord.count({ where }),
  ]);

  return { data, total, page, limit };
}

async function getFacultyId(userId) {
  const faculty = await prisma.faculty.findUnique({ where: { userId } });
  if (!faculty) throw new NotFoundError('Faculty profile not found');
  return faculty.id;
}

async function updateRecord(id, userId, data) {
  const facultyId = await getFacultyId(userId);
  const record = await prisma.attendanceRecord.findUnique({
    where: { id },
    include: { dispute: { select: { id: true } } },
  });
  if (!record) throw new NotFoundError('Attendance record not found');

  const oldStatus = record.status;
  const newStatus = data.status;

  if (oldStatus === newStatus) {
    return prisma.attendanceRecord.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentId: true, course: { select: { code: true } } },
        },
        event: { select: { id: true, title: true, eventDate: true } },
      },
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.attendanceRecord.update({
      where: { id },
      data: { status: newStatus, scanMethod: 'manual' },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentId: true, course: { select: { code: true } } },
        },
        event: { select: { id: true, title: true, eventDate: true } },
      },
    });

    await tx.attendanceRecordChange.create({
      data: {
        attendanceRecordId: id,
        changedById: facultyId,
        oldStatus,
        newStatus,
        changeType: 'manual_edit',
        reason: data.reason || null,
      },
    });

    return changed;
  });

  return updated;
}

async function createRecord(userId, data) {
  const facultyId = await getFacultyId(userId);
  const student = await prisma.student.findUnique({ where: { id: data.studentId } });
  if (!student) throw new NotFoundError('Student not found');

  const event = await prisma.event.findUnique({ where: { id: data.eventId } });
  if (!event) throw new NotFoundError('Event not found');

  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      uq_attendance_event_student: {
        studentId: data.studentId,
        eventId: data.eventId,
      },
    },
  });
  if (existing) throw new ConflictError('Attendance record already exists for this student and event');

  const created = await prisma.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.create({
      data: {
        studentId: data.studentId,
        eventId: data.eventId,
        status: data.status,
        scannedAt: data.scannedAt ? new Date(data.scannedAt) : null,
        scanMethod: 'manual',
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentId: true, course: { select: { code: true } } },
        },
        event: { select: { id: true, title: true, eventDate: true } },
      },
    });

    await tx.attendanceRecordChange.create({
      data: {
        attendanceRecordId: record.id,
        changedById: facultyId,
        newStatus: data.status,
        changeType: 'manual_add',
        reason: data.reason || null,
      },
    });

    return record;
  });

  return created;
}

async function deleteRecord(id, userId) {
  const facultyId = await getFacultyId(userId);
  const record = await prisma.attendanceRecord.findUnique({
    where: { id },
    include: {
      dispute: { select: { id: true } },
      student: { select: { id: true, firstName: true, lastName: true } },
      event: { select: { title: true } },
    },
  });
  if (!record) throw new NotFoundError('Attendance record not found');
  if (record.dispute) throw new ConflictError('Cannot delete attendance record with an active dispute');

  await prisma.$transaction(async (tx) => {
    await tx.attendanceRecordChange.create({
      data: {
        attendanceRecordId: id,
        changedById: facultyId,
        oldStatus: record.status,
        newStatus: record.status,
        changeType: 'delete',
      },
    });

    await tx.attendanceRecord.delete({ where: { id } });
  });
}

module.exports = { listRecords, updateRecord, createRecord, deleteRecord };
