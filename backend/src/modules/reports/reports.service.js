const prisma = require('../../config/database');

async function attendanceByEvent(page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      skip,
      take: limit,
      orderBy: { eventDate: 'desc' },
      include: {
        course: { select: { code: true, name: true } },
        _count: { select: { attendanceRecords: true } },
      },
    }),
    prisma.event.count(),
  ]);

  if (events.length === 0) return { data: [], total, page, limit };

  const eventIds = events.map((e) => e.id);
  const statusCounts = await prisma.attendanceRecord.groupBy({
    by: ['eventId', 'status'],
    where: { eventId: { in: eventIds } },
    _count: true,
  });

  const countMap = {};
  for (const row of statusCounts) {
    if (!countMap[row.eventId]) countMap[row.eventId] = { present: 0, late: 0, absent: 0 };
    countMap[row.eventId][row.status] = row._count;
  }

  const data = events.map((event) => {
    const totalRecords = event._count.attendanceRecords;
    const counts = countMap[event.id] || { present: 0, late: 0, absent: 0 };

    return {
      id: event.id,
      title: event.title,
      eventDate: event.eventDate,
      course: event.course,
      totalStudents: totalRecords,
      present: counts.present,
      late: counts.late,
      absent: counts.absent,
      attendanceRate: totalRecords > 0
        ? Math.round(((counts.present + counts.late) / totalRecords) * 100)
        : null,
    };
  });

  return { data, total, page, limit };
}

async function attendanceByCourse(page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      skip,
      take: limit,
      orderBy: { code: 'asc' },
      include: { _count: { select: { events: true } } },
    }),
    prisma.course.count(),
  ]);

  if (courses.length === 0) return { data: [], total, page, limit };

  const courseIds = courses.map((c) => c.id);
  const events = await prisma.event.findMany({
    where: { courseId: { in: courseIds } },
    select: { id: true, courseId: true },
  });

  const eventIds = events.map((e) => e.id);
  const eventCourseMap = {};
  for (const e of events) {
    eventCourseMap[e.id] = e.courseId;
  }

  const statusCounts = eventIds.length > 0
    ? await prisma.attendanceRecord.groupBy({
        by: ['eventId', 'status'],
        where: { eventId: { in: eventIds } },
        _count: true,
      })
    : [];

  const courseCounts = {};
  for (const row of statusCounts) {
    const cId = eventCourseMap[row.eventId];
    if (!courseCounts[cId]) courseCounts[cId] = { total: 0, present: 0, late: 0 };
    courseCounts[cId].total += row._count;
    if (row.status === 'present') courseCounts[cId].present += row._count;
    if (row.status === 'late') courseCounts[cId].late += row._count;
  }

  const data = courses.map((course) => {
    const counts = courseCounts[course.id] || { total: 0, present: 0, late: 0 };
    return {
      id: course.id,
      code: course.code,
      name: course.name,
      totalEvents: course._count.events,
      totalRecords: counts.total,
      present: counts.present,
      late: counts.late,
      absent: counts.total - counts.present - counts.late,
      attendanceRate: counts.total > 0
        ? Math.round(((counts.present + counts.late) / counts.total) * 100)
        : null,
    };
  });

  return { data, total, page, limit };
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

  const eventIds = recentEvents.map((e) => e.id);
  const statusCounts = eventIds.length > 0
    ? await prisma.attendanceRecord.groupBy({
        by: ['eventId', 'status'],
        where: { eventId: { in: eventIds } },
        _count: true,
      })
    : [];

  const trendMap = {};
  for (const row of statusCounts) {
    if (!trendMap[row.eventId]) trendMap[row.eventId] = { present: 0, late: 0 };
    if (row.status === 'present') trendMap[row.eventId].present = row._count;
    if (row.status === 'late') trendMap[row.eventId].late = row._count;
  }

  const trend = recentEvents
    .map((event) => {
      const totalRecords = event._count.attendanceRecords;
      if (totalRecords === 0) return null;
      const counts = trendMap[event.id] || { present: 0, late: 0 };
      return {
        date: event.eventDate.toISOString().split('T')[0],
        event: event.title,
        presentRate: Math.round(((counts.present + counts.late) / totalRecords) * 100),
        present: counts.present,
        late: counts.late,
        absent: totalRecords - counts.present - counts.late,
        total: totalRecords,
      };
    })
    .filter(Boolean);

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

async function balanceReport(startDate, endDate, courseId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
  }
  if (courseId) where.student = { courseId };

  const [data, total, aggregation] = await Promise.all([
    prisma.balance.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { firstName: true, lastName: true, studentId: true, course: { select: { code: true, name: true } } },
        },
      },
    }),
    prisma.balance.count({ where }),
    prisma.balance.groupBy({
      by: ['status'],
      where,
      _count: true,
      _sum: { amount: true },
    }),
  ]);

  const stats = { unpaid: 0, partial: 0, paid: 0, totalOutstanding: 0, totalCollected: 0 };
  for (const row of aggregation) {
    stats[row.status] = row._count;
    if (row.status === 'unpaid' || row.status === 'partial') {
      stats.totalOutstanding += Number(row._sum.amount);
    } else {
      stats.totalCollected += Number(row._sum.amount);
    }
  }

  const rows = data.map((b) => ({
    id: b.id,
    studentName: `${b.student.firstName} ${b.student.lastName}`,
    studentId: b.student.studentId,
    course: b.student.course?.code ?? '',
    description: b.description,
    amount: Number(b.amount),
    status: b.status,
    dueDate: b.dueDate,
    createdAt: b.createdAt,
  }));

  return { data: rows, total, page, limit, stats };
}

async function sanctionReport(startDate, endDate, type, courseId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = {};
  if (startDate || endDate) {
    where.triggeredAt = {};
    if (startDate) where.triggeredAt.gte = new Date(startDate);
    if (endDate) where.triggeredAt.lte = new Date(endDate + 'T23:59:59.999Z');
  }
  if (type) where.sanctionRule = { type };
  if (courseId) where.student = { courseId };

  const [data, total, ruleIdCounts] = await Promise.all([
    prisma.sanction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { triggeredAt: 'desc' },
      include: {
        student: {
          select: { firstName: true, lastName: true, studentId: true, course: { select: { code: true, name: true } } },
        },
        sanctionRule: { select: { type: true, sanctionLevel: true } },
      },
    }),
    prisma.sanction.count({ where }),
    prisma.sanction.groupBy({
      by: ['sanctionRuleId'],
      where,
      _count: true,
    }),
  ]);

  const ruleIds = ruleIdCounts.map((r) => r.sanctionRuleId);
  const rules = ruleIds.length > 0
    ? await prisma.sanctionRule.findMany({
        where: { id: { in: ruleIds } },
        select: { id: true, type: true, sanctionLevel: true },
      })
    : [];

  const ruleMap = {};
  for (const r of rules) ruleMap[r.id] = r;

  const bySeverity = {};
  const byType = {};
  for (const row of ruleIdCounts) {
    const rule = ruleMap[row.sanctionRuleId];
    if (rule) {
      bySeverity[rule.sanctionLevel] = (bySeverity[rule.sanctionLevel] || 0) + row._count;
      byType[rule.type] = (byType[rule.type] || 0) + row._count;
    }
  }

  const rows = data.map((s) => ({
    id: s.id,
    studentName: `${s.student.firstName} ${s.student.lastName}`,
    studentId: s.student.studentId,
    course: s.student.course?.code ?? '',
    type: s.sanctionRule.type,
    sanctionLevel: s.sanctionRule.sanctionLevel,
    status: s.status,
    triggeredAt: s.triggeredAt,
  }));

  return {
    data: rows,
    total,
    page,
    limit,
    stats: {
      totalActive: data.filter((s) => s.status === 'active').length,
      bySeverity: Object.entries(bySeverity).map(([level, count]) => ({ level, count })),
      byType: Object.entries(byType).map(([typeVal, count]) => ({ type: typeVal, count })),
    },
  };
}

module.exports = { attendanceByEvent, attendanceByCourse, dashboard, balanceReport, sanctionReport };
