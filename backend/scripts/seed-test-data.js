const prisma = require('../src/config/database');

async function seed() {
  await prisma.attendanceRecord.upsert({
    where: {
      uq_attendance_event_student: {
        studentId: '0235c63e-abd5-47dc-a983-c26617574c83',
        eventId: '1b1d8a9d-19b0-405f-8719-4639d6be4863',
      }
    },
    update: { status: 'present', scannedAt: new Date(), scanMethod: 'manual' },
    create: {
      studentId: '0235c63e-abd5-47dc-a983-c26617574c83',
      eventId: '1b1d8a9d-19b0-405f-8719-4639d6be4863',
      status: 'present',
      scannedAt: new Date(),
      scanMethod: 'manual',
    }
  });

  await prisma.balance.create({
    data: {
      studentId: '0235c63e-abd5-47dc-a983-c26617574c83',
      description: 'Tuition fee',
      amount: 25000,
      status: 'unpaid',
      dueDate: new Date('2026-08-30'),
    }
  });

  console.log('Data added successfully');
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e.message); process.exit(1); });
