const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const crypto = require('crypto');

function generatePasscode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function listEvents(user, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  let where = {};

  if (user.role === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: user.sub } });
    if (student) {
      where = {
        OR: [
          { courseId: student.courseId, targetYearLevel: student.yearLevel },
          { courseId: student.courseId, targetYearLevel: null },
          { courseId: null },
        ],
      };
    }
  }

  const [data, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { eventDate: 'desc' },
      include: { course: { select: { code: true, name: true } } },
    }),
    prisma.event.count({ where }),
  ]);

  return { data, total, page, limit };
}

async function getEvent(id) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      course: { select: { code: true, name: true } },
      _count: { select: { attendanceRecords: true } },
    },
  });
  if (!event) throw new NotFoundError('Event not found');
  return event;
}

async function createEvent(userId, data) {
  const programPasscode = generatePasscode();

  const eventDate = new Date(data.eventDate);
  const startTime = new Date(`1970-01-01T${data.startTime}`);
  const endTime = new Date(`1970-01-01T${data.endTime}`);
  const passcodeExpiresAt = data.passcodeExpiresAt ? new Date(data.passcodeExpiresAt) : null;

  const faculty = await prisma.faculty.findUnique({ where: { userId } });
  if (!faculty) throw new NotFoundError('Faculty profile not found');

  const event = await prisma.$transaction(async (tx) => {
    const newEvent = await tx.event.create({
      data: {
        facultyId: faculty.id,
        title: data.title,
        description: data.description || null,
        venue: data.venue,
        eventDate,
        startTime,
        endTime,
        lateCutoffTime: data.lateCutoffTime,
        isMandatory: data.isMandatory,
        courseId: data.courseId || null,
        targetYearLevel: data.targetYearLevel || null,
        programPasscode,
        passcodeExpiresAt,
        isActive: true,
      },
    });

    if (data.isMandatory && data.courseId) {
      const students = await tx.student.findMany({
        where: {
          courseId: data.courseId,
          ...(data.targetYearLevel ? { yearLevel: data.targetYearLevel } : {}),
        },
      });

      if (students.length > 0) {
        await tx.attendanceRecord.createMany({
          data: students.map(s => ({
            studentId: s.id,
            eventId: newEvent.id,
            status: 'absent',
          })),
        });
      }
    }

    return newEvent;
  });

  return event;
}

async function updateEvent(id, data) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Event not found');

  return prisma.event.update({ where: { id }, data });
}

async function deleteEvent(id) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Event not found');
  await prisma.event.delete({ where: { id } });
}

module.exports = { listEvents, getEvent, createEvent, updateEvent, deleteEvent };
