const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const env = require('../config/env');
const logger = require('../utils/logger');

async function seedFaculty() {
  const email = env.facultyEmail;
  const password = env.facultyPassword;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.debug('Faculty account already exists, skipping seed');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'faculty',
      faculty: {
        create: {
          fullName: 'Faculty Admin',
        },
      },
    },
  });

  logger.info('Faculty account seeded', { email });
}

async function seedSampleData() {
  const facultyUser = await prisma.user.findUnique({
    where: { email: env.facultyEmail },
    include: { faculty: true },
  });
  if (!facultyUser) {
    logger.error('Faculty not found for sample data seed');
    return;
  }

  const existingCourses = await prisma.course.count();
  if (existingCourses > 0) {
    logger.debug('Sample data already exists, skipping');
    return;
  }

  const course1 = await prisma.course.create({
    data: { code: 'BSIT', name: 'Bachelor of Science in Information Technology' },
  });
  const course2 = await prisma.course.create({
    data: { code: 'BSCS', name: 'Bachelor of Science in Computer Science' },
  });

  const studentHash = await bcrypt.hash('student123', 12);

  const students = [
    { email: 'student1@test.com', firstName: 'Juan', lastName: 'Dela Cruz', studentId: '2024-0001', courseId: course1.id, yearLevel: 2 },
    { email: 'student2@test.com', firstName: 'Maria', lastName: 'Santos', studentId: '2024-0002', courseId: course1.id, yearLevel: 2 },
    { email: 'student3@test.com', firstName: 'Pedro', lastName: 'Gonzales', studentId: '2024-0003', courseId: course2.id, yearLevel: 1 },
  ];

  for (const s of students) {
    await prisma.user.create({
      data: {
        email: s.email,
        passwordHash: studentHash,
        role: 'student',
        student: {
          create: {
            firstName: s.firstName,
            lastName: s.lastName,
            studentId: s.studentId,
            courseId: s.courseId,
            yearLevel: s.yearLevel,
            qrCodeToken: require('crypto').randomBytes(32).toString('hex'),
          },
        },
      },
    });
  }

  await prisma.sanctionRule.createMany({
    data: [
      { absenceThreshold: 3, sanctionLevel: 'Warning', description: 'First warning after 3 absences' },
      { absenceThreshold: 5, sanctionLevel: 'Probation', description: 'Academic probation after 5 absences' },
      { absenceThreshold: 8, sanctionLevel: 'Suspended', description: 'Suspension after 8 absences' },
    ],
  });

  await prisma.paymentMethod.create({
    data: { name: 'Cash', facultyId: facultyUser.faculty.id },
  });
  await prisma.paymentMethod.create({
    data: { name: 'GCash', facultyId: facultyUser.faculty.id },
  });
  await prisma.paymentMethod.create({
    data: { name: 'Bank Transfer', facultyId: facultyUser.faculty.id },
  });

  logger.info('Sample data seeded successfully');
}

module.exports = { seedFaculty, seedSampleData };
