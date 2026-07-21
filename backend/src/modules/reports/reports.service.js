const prisma = require('../../config/database');

async function attendanceByEvent(page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const events = await prisma.event.findMany({
    skip,
    take: limit,
    orderBy: { eventDate: 'desc' },
    include: {
      course: { select: { code: true, name: true } },
      _count: { select: { attendanceRecords: true } },
    },
  });

  const data = await Promise.all(events.map(async (event) => {
    const totalRecords = event._count.attendanceRecords;
    if (totalRecords === 0) {
      return {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
        course: event.course,
        totalStudents: 0,
        present: 0,
        late: 0,
        absent: 0,
        attendanceRate: null,
      };
    }

    const [present, late, absent] = await Promise.all([
      prisma.attendanceRecord.count({ where: { eventId: event.id, status: 'present' } }),
      prisma.attendanceRecord.count({ where: { eventId: event.id, status: 'late' } }),
      prisma.attendanceRecord.count({ where: { eventId: event.id, status: 'absent' } }),
    ]);

    return {
      id: event.id,
      title: event.title,
      eventDate: event.eventDate,
      course: event.course,
      totalStudents: totalRecords,
      present,
      late,
      absent,
      attendanceRate: Math.round(((present + late) / totalRecords) * 100),
    };
  }));

  const total = await prisma.event.count();
  return { data, total, page, limit };
}

async function attendanceByCourse() {
  const courses = await prisma.course.findMany({
    include: { _count: { select: { events: true } } },
  });

  const data = await Promise.all(courses.map(async (course) => {
    const totalRecords = await prisma.attendanceRecord.count({
      where: { event: { courseId: course.id } },
    });

    if (totalRecords === 0) {
      return {
        id: course.id,
        code: course.code,
        name: course.name,
        totalEvents: course._count.events,
        totalRecords: 0,
        present: 0,
        late: 0,
        absent: 0,
        attendanceRate: null,
      };
    }

    const [present, late] = await Promise.all([
      prisma.attendanceRecord.count({ where: { event: { courseId: course.id }, status: 'present' } }),
      prisma.attendanceRecord.count({ where: { event: { courseId: course.id }, status: 'late' } }),
    ]);

    return {
      id: course.id,
      code: course.code,
      name: course.name,
      totalEvents: course._count.events,
      totalRecords,
      present,
      late,
      absent: totalRecords - present - late,
      attendanceRate: Math.round(((present + late) / totalRecords) * 100),
    };
  }));

  return { data };
}

async function dashboard() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalStudents, eventsThisMonth, activeSanctions, balanceAgg] = await Promise.all([
    prisma.student.count(),
    prisma.event.count({ where: { eventDate: { gte: startOfMonth } } }),
    prisma.sanction.count({ where: { status: 'active' } }),
    prisma.balance.aggregate({
      _sum: { amount: true },
      where: { status: { in: ['unpaid', 'partial'] } },
    }),
  ]);

  const [present, late, absent] = await Promise.all([
    prisma.attendanceRecord.count({ where: { status: 'present' } }),
    prisma.attendanceRecord.count({ where: { status: 'late' } }),
    prisma.attendanceRecord.count({ where: { status: 'absent' } }),
  ]);

  const [unpaid, partialBal, paid] = await Promise.all([
    prisma.balance.count({ where: { status: 'unpaid' } }),
    prisma.balance.count({ where: { status: 'partial' } }),
    prisma.balance.count({ where: { status: 'paid' } }),
  ]);

  // Attendance trend: daily rates for last 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentEvents = await prisma.event.findMany({
    where: { eventDate: { gte: thirtyDaysAgo, lte: now } },
    orderBy: { eventDate: 'asc' },
    select: {
      id: true,
      title: true,
      eventDate: true,
      _count: { select: { attendanceRecords: true } },
    },
  });

  const attendanceTrend = await Promise.all(
    recentEvents.map(async (event) => {
      const totalRecords = event._count.attendanceRecords;
      if (totalRecords === 0) return null;

      const [presentCount, lateCount] = await Promise.all([
        prisma.attendanceRecord.count({
          where: { eventId: event.id, status: 'present' },
        }),
        prisma.attendanceRecord.count({
          where: { eventId: event.id, status: 'late' },
        }),
      ]);

      return {
        date: event.eventDate.toISOString().split('T')[0],
        event: event.title,
        presentRate: Math.round(((presentCount + lateCount) / totalRecords) * 100),
        present: presentCount,
        late: lateCount,
        absent: totalRecords - presentCount - lateCount,
        total: totalRecords,
      };
    })
  );

  const trend = attendanceTrend.filter(Boolean);

  // Recent attendance records for table
  const recentAttendance = await prisma.attendanceRecord.findMany({
    orderBy: { scannedAt: 'desc' },
    take: 20,
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          studentId: true,
          course: { select: { code: true } },
        },
      },
      event: { select: { title: true, eventDate: true } },
    },
  });

  const recentTable = recentAttendance.map((r) => ({
    id: r.id,
    studentName: `${r.student.firstName} ${r.student.lastName}`,
    studentId: r.student.studentId,
    course: r.student.course?.code ?? '',
    event: r.event.title,
    date: r.event.eventDate,
    status: r.status,
    scannedAt: r.scannedAt,
  }));

  return {
    stats: {
      totalStudents,
      eventsThisMonth,
      activeSanctions,
      totalOutstanding: Number(balanceAgg._sum.amount) || 0,
    },
    attendanceBreakdown: { present, late, absent },
    balanceBreakdown: { unpaid, partial: partialBal, paid },
    attendanceTrend: trend,
    recentAttendance: recentTable,
  };
}

module.exports = { attendanceByEvent, attendanceByCourse, dashboard };
