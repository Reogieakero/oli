const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('../config/database');
const env = require('../config/env');
const logger = require('../utils/logger');

async function seedFaculty() {
  const email = env.facultyEmail;
  const password = env.facultyPassword;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.debug('Faculty account already exists, skipping seed');
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
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
    include: { faculty: true },
  });

  logger.info('Faculty account seeded', { email });
  return user;
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

  // ── Courses ──
  const course1 = await prisma.course.create({
    data: { code: 'BSIT', name: 'Bachelor of Science in Information Technology' },
  });
  const course2 = await prisma.course.create({
    data: { code: 'BSCS', name: 'Bachelor of Science in Computer Science' },
  });

  // ── Students (8) ──
  const studentHash = await bcrypt.hash('student123', 12);

  const studentData = [
    { email: 'student1@test.com', firstName: 'Juan', lastName: 'Dela Cruz', studentId: '2024-0001', courseId: course1.id, yearLevel: 2 },
    { email: 'student2@test.com', firstName: 'Maria', lastName: 'Santos', studentId: '2024-0002', courseId: course1.id, yearLevel: 2 },
    { email: 'student3@test.com', firstName: 'Pedro', lastName: 'Gonzales', studentId: '2024-0003', courseId: course2.id, yearLevel: 1 },
    { email: 'student4@test.com', firstName: 'Ana', lastName: 'Reyes', studentId: '2024-0004', courseId: course1.id, yearLevel: 3 },
    { email: 'student5@test.com', firstName: 'Carlos', lastName: 'Mendoza', studentId: '2024-0005', courseId: course2.id, yearLevel: 2 },
    { email: 'student6@test.com', firstName: 'Sofia', lastName: 'Lopez', studentId: '2024-0006', courseId: course1.id, yearLevel: 1 },
    { email: 'student7@test.com', firstName: 'Miguel', lastName: 'Torres', studentId: '2024-0007', courseId: course2.id, yearLevel: 3 },
    { email: 'student8@test.com', firstName: 'Angela', lastName: 'Cruz', studentId: '2024-0008', courseId: course1.id, yearLevel: 2 },
  ];

  const createdStudents = [];
  for (const s of studentData) {
    const user = await prisma.user.create({
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
            qrCodeToken: crypto.randomBytes(32).toString('hex'),
          },
        },
      },
      include: { student: true },
    });
    createdStudents.push(user.student);
  }

  // ── Events (6) ──
  const events = await Promise.all([
    prisma.event.create({
      data: {
        facultyId: facultyUser.faculty.id,
        courseId: course1.id,
        title: 'General Assembly',
        description: 'University-wide general assembly for BSIT students',
        venue: 'Main Auditorium',
        eventDate: new Date('2025-07-15'),
        startTime: new Date('2025-07-15T08:00:00'),
        endTime: new Date('2025-07-15T10:00:00'),
        lateCutoffTime: 15,
        isMandatory: true,
        targetYearLevel: null,
        programPasscode: 'GA-001',
        isActive: true,
      },
    }),
    prisma.event.create({
      data: {
        facultyId: facultyUser.faculty.id,
        courseId: course1.id,
        title: 'BSIT Seminar: Cybersecurity Basics',
        description: 'Introductory seminar on cybersecurity best practices',
        venue: 'Room 201',
        eventDate: new Date('2025-07-20'),
        startTime: new Date('2025-07-20T09:00:00'),
        endTime: new Date('2025-07-20T12:00:00'),
        lateCutoffTime: 15,
        isMandatory: false,
        targetYearLevel: 2,
        programPasscode: 'SEM-002',
        isActive: true,
      },
    }),
    prisma.event.create({
      data: {
        facultyId: facultyUser.faculty.id,
        courseId: course2.id,
        title: 'BSCS Workshop: Web Development',
        description: 'Hands-on workshop on modern web development with React',
        venue: 'Computer Lab 3',
        eventDate: new Date('2025-07-22'),
        startTime: new Date('2025-07-22T13:00:00'),
        endTime: new Date('2025-07-22T16:00:00'),
        lateCutoffTime: 10,
        isMandatory: true,
        targetYearLevel: 2,
        programPasscode: 'WS-003',
        isActive: true,
      },
    }),
    prisma.event.create({
      data: {
        facultyId: facultyUser.faculty.id,
        courseId: course1.id,
        title: 'BSIT Orientation',
        description: 'Orientation for new BSIT students',
        venue: 'Lecture Hall B',
        eventDate: new Date('2025-08-01'),
        startTime: new Date('2025-08-01T08:00:00'),
        endTime: new Date('2025-08-01T11:00:00'),
        lateCutoffTime: 15,
        isMandatory: true,
        targetYearLevel: 1,
        programPasscode: 'OR-004',
        isActive: true,
      },
    }),
    prisma.event.create({
      data: {
        facultyId: facultyUser.faculty.id,
        courseId: course2.id,
        title: 'BSCS Guest Lecture: AI Trends',
        description: 'Guest lecture on artificial intelligence trends in 2025',
        venue: 'Innovation Hub',
        eventDate: new Date('2025-08-05'),
        startTime: new Date('2025-08-05T10:00:00'),
        endTime: new Date('2025-08-05T12:00:00'),
        lateCutoffTime: 10,
        isMandatory: false,
        targetYearLevel: null,
        programPasscode: 'GL-005',
        isActive: true,
      },
    }),
    prisma.event.create({
      data: {
        facultyId: facultyUser.faculty.id,
        courseId: null,
        title: 'University Sports Fest',
        description: 'Annual inter-department sports festival',
        venue: 'Sports Complex',
        eventDate: new Date('2025-08-10'),
        startTime: new Date('2025-08-10T07:00:00'),
        endTime: new Date('2025-08-10T17:00:00'),
        lateCutoffTime: 30,
        isMandatory: false,
        targetYearLevel: null,
        programPasscode: 'SP-006',
        isActive: true,
      },
    }),
  ]);

  // ── Attendance Records (24 records across events) ──
  const attendanceData = [
    // Event 1: General Assembly
    { studentIdx: 0, eventIdx: 0, status: 'present', scanned: true },
    { studentIdx: 1, eventIdx: 0, status: 'present', scanned: true },
    { studentIdx: 2, eventIdx: 0, status: 'late', scanned: true },
    { studentIdx: 3, eventIdx: 0, status: 'present', scanned: true },
    { studentIdx: 4, eventIdx: 0, status: 'absent', scanned: false },
    { studentIdx: 5, eventIdx: 0, status: 'present', scanned: true },
    { studentIdx: 6, eventIdx: 0, status: 'late', scanned: true },
    { studentIdx: 7, eventIdx: 0, status: 'present', scanned: true },
    // Event 2: BSIT Seminar
    { studentIdx: 0, eventIdx: 1, status: 'present', scanned: true },
    { studentIdx: 1, eventIdx: 1, status: 'absent', scanned: false },
    { studentIdx: 3, eventIdx: 1, status: 'present', scanned: true },
    { studentIdx: 5, eventIdx: 1, status: 'late', scanned: true },
    { studentIdx: 7, eventIdx: 1, status: 'present', scanned: true },
    // Event 3: BSCS Workshop
    { studentIdx: 2, eventIdx: 2, status: 'present', scanned: true },
    { studentIdx: 4, eventIdx: 2, status: 'present', scanned: true },
    { studentIdx: 6, eventIdx: 2, status: 'absent', scanned: false },
    // Event 4: BSIT Orientation
    { studentIdx: 5, eventIdx: 3, status: 'present', scanned: true },
    { studentIdx: 0, eventIdx: 3, status: 'present', scanned: true },
    { studentIdx: 3, eventIdx: 3, status: 'late', scanned: true },
    { studentIdx: 7, eventIdx: 3, status: 'present', scanned: true },
    // Event 5: Guest Lecture
    { studentIdx: 2, eventIdx: 4, status: 'present', scanned: true },
    { studentIdx: 4, eventIdx: 4, status: 'late', scanned: true },
    { studentIdx: 6, eventIdx: 4, status: 'present', scanned: true },
    // Event 6: Sports Fest
    { studentIdx: 1, eventIdx: 5, status: 'absent', scanned: false },
    { studentIdx: 3, eventIdx: 5, status: 'present', scanned: true },
  ];

  for (const a of attendanceData) {
    await prisma.attendanceRecord.create({
      data: {
        studentId: createdStudents[a.studentIdx].id,
        eventId: events[a.eventIdx].id,
        status: a.status,
        scannedAt: a.scanned ? new Date() : null,
        scanMethod: a.scanned ? 'qr_scan' : null,
      },
    });
  }

  // ── Balances (8) ──
  const balanceData = [
    { studentIdx: 0, description: 'Tuition Fee - 1st Semester', amount: 15000, status: 'partial' },
    { studentIdx: 0, description: 'Laboratory Fee', amount: 2500, status: 'unpaid' },
    { studentIdx: 1, description: 'Tuition Fee - 1st Semester', amount: 15000, status: 'paid' },
    { studentIdx: 2, description: 'Tuition Fee - 1st Semester', amount: 15000, status: 'unpaid' },
    { studentIdx: 3, description: 'Miscellaneous Fee', amount: 3500, status: 'partial' },
    { studentIdx: 4, description: 'Tuition Fee - 1st Semester', amount: 15000, status: 'unpaid' },
    { studentIdx: 5, description: 'Library Fee', amount: 1000, status: 'paid' },
    { studentIdx: 6, description: 'Tuition Fee - 1st Semester', amount: 15000, status: 'partial' },
  ];

  const createdBalances = [];
  for (const b of balanceData) {
    const balance = await prisma.balance.create({
      data: {
        studentId: createdStudents[b.studentIdx].id,
        description: b.description,
        amount: b.amount,
        status: b.status,
        dueDate: new Date('2025-09-30'),
      },
    });
    createdBalances.push(balance);
  }

  // ── Sanction Rules ──
  const rules = await Promise.all([
    prisma.sanctionRule.create({
      data: { absenceThreshold: 3, sanctionLevel: 'Warning', description: 'First warning after 3 absences' },
    }),
    prisma.sanctionRule.create({
      data: { absenceThreshold: 5, sanctionLevel: 'Probation', description: 'Academic probation after 5 absences' },
    }),
    prisma.sanctionRule.create({
      data: { absenceThreshold: 8, sanctionLevel: 'Suspended', description: 'Suspension after 8 absences' },
    }),
  ]);

  // ── Sanctions (2) ──
  await prisma.sanction.create({
    data: {
      studentId: createdStudents[4].id,
      sanctionRuleId: rules[0].id,
      status: 'active',
      notes: 'Missed 3 events without valid reason',
    },
  });
  await prisma.sanction.create({
    data: {
      studentId: createdStudents[1].id,
      sanctionRuleId: rules[1].id,
      status: 'active',
      notes: 'Exceeded absence threshold for the semester',
    },
  });

  // ── Payment Methods ──
  await prisma.paymentMethod.create({ data: { name: 'Cash', facultyId: facultyUser.faculty.id } });
  await prisma.paymentMethod.create({ data: { name: 'GCash', facultyId: facultyUser.faculty.id } });
  await prisma.paymentMethod.create({ data: { name: 'Bank Transfer', facultyId: facultyUser.faculty.id } });

  // ── Payments (3) ──
  const paymentMethods = await prisma.paymentMethod.findMany();
  await prisma.payment.create({
    data: {
      balanceId: createdBalances[1].id,
      paymentMethodId: paymentMethods[0].id,
      amount: 15000,
      referenceNo: 'REF-001',
      recordedBy: facultyUser.faculty.id,
      notes: 'Full payment for tuition',
    },
  });
  await prisma.payment.create({
    data: {
      balanceId: createdBalances[5].id,
      paymentMethodId: paymentMethods[1].id,
      amount: 1000,
      referenceNo: 'GC-002',
      recordedBy: facultyUser.faculty.id,
    },
  });
  await prisma.payment.create({
    data: {
      balanceId: createdBalances[0].id,
      paymentMethodId: paymentMethods[2].id,
      amount: 8000,
      referenceNo: 'BT-003',
      recordedBy: facultyUser.faculty.id,
      notes: 'Partial payment',
    },
  });

  // ── Announcements (3) ──
  await prisma.announcement.create({
    data: {
      facultyId: facultyUser.faculty.id,
      courseId: course1.id,
      title: 'Schedule Change: BSIT General Assembly',
      content: 'The General Assembly scheduled for July 15 has been moved to the Main Auditorium. Please be seated by 7:45 AM.',
      isGeneral: false,
    },
  });
  await prisma.announcement.create({
    data: {
      facultyId: facultyUser.faculty.id,
      courseId: null,
      title: 'University-wide: Sports Fest Registration',
      content: 'Registration for the Annual Sports Fest is now open. Sign up at the Student Affairs office until August 5.',
      isGeneral: true,
      targetYearLevel: null,
    },
  });
  await prisma.announcement.create({
    data: {
      facultyId: facultyUser.faculty.id,
      courseId: course2.id,
      title: 'BSCS Workshop Materials',
      content: 'Please bring your laptops for the Web Development workshop. Pre-install Node.js and VS Code.',
      isGeneral: false,
      targetYearLevel: 2,
    },
  });

  // ── Disputes (2) ──
  const records = await prisma.attendanceRecord.findMany({
    where: { status: 'absent', dispute: null },
    take: 2,
  });
  if (records.length >= 2) {
    await prisma.dispute.create({
      data: {
        attendanceRecordId: records[0].id,
        studentId: records[0].studentId,
        reason: 'I was present but the scanner did not register my QR code.',
        status: 'pending',
      },
    });
    await prisma.dispute.create({
      data: {
        attendanceRecordId: records[1].id,
        studentId: records[1].studentId,
        reason: 'I arrived 2 minutes late due to heavy traffic but was marked absent.',
        status: 'pending',
      },
    });
  }

  // ── Feedback (3) ──
  const someStudents = await prisma.student.findMany({ take: 3 });
  await prisma.feedback.create({
    data: {
      userId: someStudents[0].userId,
      subject: 'Great Event',
      message: 'The Cybersecurity seminar was very informative. Hope to have more sessions like this.',
      isAnonymous: false,
    },
  });
  await prisma.feedback.create({
    data: {
      userId: someStudents[1].userId,
      subject: 'Attendance System Suggestion',
      message: 'It would be helpful to get notified via email when marked absent.',
      isAnonymous: true,
    },
  });
  await prisma.feedback.create({
    data: {
      userId: someStudents[2].userId,
      subject: 'Sports Fest Feedback',
      message: 'The event was well-organized. Looking forward to next year!',
      isAnonymous: false,
    },
  });

  // ── Audit Files (2) ──
  await prisma.auditFile.create({
    data: {
      facultyId: facultyUser.faculty.id,
      title: 'Q2 2025 Attendance Report',
      description: 'Summary of attendance records for the second quarter',
      fileName: 'q2-2025-attendance.pdf',
      fileUrl: '/audit/q2-2025-attendance.pdf',
      fileSize: 245000,
      mimeType: 'application/pdf',
    },
  });
  await prisma.auditFile.create({
    data: {
      facultyId: facultyUser.faculty.id,
      title: 'Student Balance Audit',
      description: 'Audit trail for student balance adjustments',
      fileName: 'balance-audit-july.xlsx',
      fileUrl: '/audit/balance-audit-july.xlsx',
      fileSize: 128000,
      mimeType: 'application/vnd.openxmlformats-officedocument.sp',
    },
  });

  logger.info('Sample data seeded successfully');
}

module.exports = { seedFaculty, seedSampleData };
