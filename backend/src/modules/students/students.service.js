const prisma = require('../../config/database');
const { NotFoundError, ConflictError } = require('../../utils/errors');

async function completeProfile(userId, data) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { student: true },
  });

  if (!user || user.role !== 'student') {
    throw new NotFoundError('Student not found');
  }

  if (!user.needsProfile) {
    throw new ConflictError('Profile already completed');
  }

  const existingStudentId = await prisma.student.findFirst({
    where: { studentId: data.studentId, NOT: { userId } },
  });
  if (existingStudentId) {
    throw new ConflictError('Student ID already exists');
  }

  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.student.update({
      where: { userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        studentId: data.studentId,
        courseId: data.courseId,
        yearLevel: data.yearLevel,
      },
    });

    return tx.user.update({
      where: { id: userId },
      data: { needsProfile: false },
      include: { student: { include: { course: true } } },
    });
  });

  return {
    id: updated.id,
    email: updated.email,
    role: updated.role,
    student: updated.student,
  };
}

async function listStudents(query = {}) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;
  const { search, courseId } = query;

  const where = {};

  if (courseId) where.courseId = courseId;

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { studentId: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        user: { select: { email: true } },
        course: { select: { id: true, code: true, name: true } },
        _count: { select: { attendanceRecords: true, sanctions: true, balances: true, disputes: true } },
      },
    }),
    prisma.student.count({ where }),
  ]);

  return { data, total, page, limit };
}

module.exports = { completeProfile, listStudents };
