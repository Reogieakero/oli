const prisma = require('../../config/database');
const { NotFoundError, ConflictError } = require('../../utils/errors');

async function listCourses(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.course.findMany({
      skip,
      take: limit,
      orderBy: { code: 'asc' },
      include: { _count: { select: { events: true, students: true } } },
    }),
    prisma.course.count(),
  ]);
  return { data, total, page, limit };
}

async function getCourse(id) {
  const course = await prisma.course.findUnique({
    where: { id },
    include: { _count: { select: { events: true, students: true } } },
  });
  if (!course) throw new NotFoundError('Course not found');
  return course;
}

async function createCourse(data) {
  const existing = await prisma.course.findUnique({ where: { code: data.code } });
  if (existing) throw new ConflictError('Course code already exists');
  return prisma.course.create({ data });
}

async function updateCourse(id, data) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new NotFoundError('Course not found');
  return prisma.course.update({ where: { id }, data });
}

async function deleteCourse(id) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new NotFoundError('Course not found');
  await prisma.course.delete({ where: { id } });
}

module.exports = { listCourses, getCourse, createCourse, updateCourse, deleteCourse };
