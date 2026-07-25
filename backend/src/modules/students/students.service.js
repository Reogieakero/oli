const prisma = require('../../config/database');

async function listStudents() {
  const data = await prisma.student.findMany({
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      course: { select: { id: true, code: true, name: true } },
    },
  });

  return { data };
}

module.exports = { listStudents };
