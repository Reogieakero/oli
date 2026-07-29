const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');

async function listSanctionRules() {
  await ensureDefaultRules();
  return prisma.sanctionRule.findMany({
    orderBy: [{ type: 'asc' }, { absenceThreshold: 'asc' }],
  });
}

async function getSanctionRule(id) {
  const rule = await prisma.sanctionRule.findUnique({ where: { id } });
  if (!rule) throw new NotFoundError('Sanction rule not found');
  return rule;
}

async function createSanctionRule(data) {
  return prisma.sanctionRule.create({ data });
}

async function updateSanctionRule(id, data) {
  const existing = await prisma.sanctionRule.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Sanction rule not found');
  return prisma.sanctionRule.update({ where: { id }, data });
}

async function deleteSanctionRule(id) {
  const existing = await prisma.sanctionRule.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Sanction rule not found');
  await prisma.sanctionRule.delete({ where: { id } });
}

const DEFAULT_RULES = [
  { type: 'absence', absenceThreshold: 1, sanctionLevel: 'Written Warning', description: 'First absence' },
  { type: 'absence', absenceThreshold: 2, sanctionLevel: 'Final Written Warning', description: 'Second absence' },
  { type: 'absence', absenceThreshold: 3, sanctionLevel: '1-Day Suspension', description: 'Third absence' },
  { type: 'absence', absenceThreshold: 4, sanctionLevel: '3-Day Suspension', description: 'Fourth absence' },
  { type: 'absence', absenceThreshold: 5, sanctionLevel: '5-Day Suspension', description: 'Fifth absence' },
  { type: 'absence', absenceThreshold: 6, sanctionLevel: '7-Day Suspension', description: 'Sixth absence' },
  { type: 'absence', absenceThreshold: 7, sanctionLevel: 'Expulsion', description: 'Seventh absence' },
  { type: 'late', absenceThreshold: 1, sanctionLevel: 'Late Warning', description: 'First late' },
  { type: 'late', absenceThreshold: 2, sanctionLevel: 'Late Final Warning', description: 'Second late' },
  { type: 'late', absenceThreshold: 3, sanctionLevel: 'Late Detention', description: 'Third late' },
  { type: 'late', absenceThreshold: 4, sanctionLevel: 'Late Suspension', description: 'Fourth late' },
  { type: 'late', absenceThreshold: 5, sanctionLevel: 'Late Extended Suspension', description: 'Fifth late' },
  { type: 'late', absenceThreshold: 6, sanctionLevel: 'Late Probation', description: 'Sixth late' },
  { type: 'late', absenceThreshold: 7, sanctionLevel: 'Late Expulsion', description: 'Seventh late' },
];

async function ensureDefaultRules() {
  const count = await prisma.sanctionRule.count();
  if (count === 0) {
    await prisma.sanctionRule.createMany({ data: DEFAULT_RULES });
    return;
  }
  const lateCount = await prisma.sanctionRule.count({ where: { type: 'late' } });
  if (lateCount === 0) {
    const lateDefaults = DEFAULT_RULES.filter((r) => r.type === 'late');
    await prisma.sanctionRule.createMany({ data: lateDefaults });
  }
}

function findBestRule(rules, absenceCount) {
  let best = null;
  for (const rule of rules) {
    if (absenceCount === rule.absenceThreshold) {
      return rule;
    }
    if (absenceCount >= rule.absenceThreshold) {
      best = rule;
    }
  }
  return best;
}

async function listSanctions(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  const rules = await prisma.sanctionRule.findMany({
    where: { isActive: true },
    orderBy: [{ type: 'asc' }, { absenceThreshold: 'asc' }],
  });

  let sanctionWhere = {};
  if (filters.status) sanctionWhere.status = filters.status;
  else sanctionWhere.status = 'active';
  if (filters.search) {
    const q = filters.search;
    sanctionWhere.student = {
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { studentId: { contains: q, mode: 'insensitive' } },
      ],
    };
  }
  if (filters.sanctionLevel) {
    sanctionWhere.sanctionRule = { sanctionLevel: filters.sanctionLevel };
  }
  if (filters.type) {
    sanctionWhere.sanctionRule = { ...sanctionWhere.sanctionRule, type: filters.type };
  }

  const [activeSanctions, total] = await Promise.all([
    prisma.sanction.findMany({
      where: sanctionWhere,
      skip,
      take: limit,
      orderBy: { triggeredAt: 'desc' },
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true, studentId: true,
            course: { select: { id: true, code: true, name: true } },
          },
        },
        sanctionRule: { select: { id: true, type: true, sanctionLevel: true, absenceThreshold: true, description: true } },
      },
    }),
    prisma.sanction.count({ where: sanctionWhere }),
  ]);

  const studentIds = activeSanctions.map((s) => s.studentId);
  const absencesPromise = studentIds.length > 0
    ? prisma.attendanceRecord.groupBy({
        by: ['studentId'],
        where: { studentId: { in: studentIds }, status: 'absent' },
        _count: true,
      })
    : Promise.resolve([]);
  const latesPromise = studentIds.length > 0
    ? prisma.attendanceRecord.groupBy({
        by: ['studentId'],
        where: { studentId: { in: studentIds }, status: 'late' },
        _count: true,
      })
    : Promise.resolve([]);
  const [absenceCounts, lateCounts] = await Promise.all([absencesPromise, latesPromise]);
  const absenceMap = Object.fromEntries(absenceCounts.map((a) => [a.studentId, a._count]));
  const lateMap = Object.fromEntries(lateCounts.map((a) => [a.studentId, a._count]));

  const data = activeSanctions.map((s) => ({
    student: s.student,
    type: s.sanctionRule.type,
    count: s.sanctionRule.type === 'late' ? (lateMap[s.studentId] || 0) : (absenceMap[s.studentId] || 0),
    bestRule: rules.find((r) => r.id === s.sanctionRuleId) || null,
    activeSanction: { id: s.id, studentId: s.studentId, sanctionRuleId: s.sanctionRuleId, status: s.status, triggeredAt: s.triggeredAt, notes: s.notes, issuedById: s.issuedById },
    currentRule: s.sanctionRule,
    hasActive: true,
  }));

  return { data, total, page, limit };
}

async function getSanction(id) {
  const sanction = await prisma.sanction.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentId: true,
          yearLevel: true,
          course: { select: { id: true, code: true, name: true } },
        },
      },
      sanctionRule: true,
    },
  });
  if (!sanction) throw new NotFoundError('Sanction not found');
  return sanction;
}

async function getSanctionSummary() {
  const [studentCount, activeCount, ruleIdCounts] = await Promise.all([
    prisma.student.count(),
    prisma.sanction.count({ where: { status: 'active' } }),
    prisma.sanction.groupBy({
      by: ['sanctionRuleId'],
      where: { status: 'active' },
      _count: true,
    }),
  ]);

  const ruleIds = ruleIdCounts.map((r) => r.sanctionRuleId);
  const rules = ruleIds.length > 0
    ? await prisma.sanctionRule.findMany({
        where: { id: { in: ruleIds } },
        select: { id: true, sanctionLevel: true, type: true },
      })
    : [];

  const ruleMap = {};
  for (const r of rules) {
    ruleMap[r.id] = r;
  }

  const bySeverity = {};
  const byType = {};
  for (const row of ruleIdCounts) {
    const rule = ruleMap[row.sanctionRuleId];
    if (rule) {
      bySeverity[rule.sanctionLevel] = (bySeverity[rule.sanctionLevel] || 0) + row._count;
      byType[rule.type] = (byType[rule.type] || 0) + row._count;
    }
  }

  return {
    active: activeCount,
    totalStudents: studentCount,
    bySeverity: Object.entries(bySeverity).map(([level, count]) => ({ level, count })),
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    byLevel: [
      { status: 'active', _count: activeCount },
      { status: 'no_sanction', _count: studentCount - activeCount },
    ],
  };
}

async function createSanction(data) {
  const rule = await prisma.sanctionRule.findUnique({ where: { id: data.sanctionRuleId } });
  if (!rule) throw new NotFoundError('Sanction rule not found');

  const existing = await prisma.sanction.findFirst({
    where: { studentId: data.studentId, status: 'active', sanctionRule: { type: rule.type } },
  });
  if (existing) {
    await prisma.sanction.update({
      where: { id: existing.id },
      data: { status: 'superseded', resolvedAt: new Date() },
    });
  }
  return prisma.sanction.create({
    data,
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
      sanctionRule: { select: { id: true, type: true, sanctionLevel: true, absenceThreshold: true, description: true } },
    },
  });
}

async function updateSanction(id, data, changedById) {
  const existing = await prisma.sanction.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Sanction not found');
  const updateData = { ...data };
  delete updateData.status;
  if (data.status && data.status !== 'active' && !existing.resolvedAt) {
    updateData.resolvedAt = new Date();
  }
  if (data.status) {
    updateData.status = data.status;
  }

  const sanction = await prisma.sanction.update({
    where: { id },
    data: updateData,
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
      sanctionRule: { select: { id: true, type: true, sanctionLevel: true, absenceThreshold: true, description: true } },
    },
  });

  if (data.status && data.status !== existing.status) {
    await prisma.sanctionStatusChange.create({
      data: {
        sanctionId: id,
        changedById,
        oldStatus: existing.status,
        newStatus: data.status,
        reason: data.reason || undefined,
      },
    });
  }

  return sanction;
}

async function getSanctionChanges(id) {
  const changes = await prisma.sanctionStatusChange.findMany({
    where: { sanctionId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      changedBy: { select: { id: true, fullName: true } },
    },
  });
  return changes;
}

async function exportSanctions(filters = {}) {
  const sanctionWhere = { status: 'active' };
  if (filters.type) sanctionWhere.sanctionRule = { type: filters.type };

  const activeSanctions = await prisma.sanction.findMany({
    where: sanctionWhere,
    include: {
      student: {
        select: { firstName: true, lastName: true, studentId: true, course: { select: { code: true } } },
      },
      sanctionRule: { select: { type: true, sanctionLevel: true, absenceThreshold: true } },
    },
  });

  const studentIds = activeSanctions.map((s) => s.studentId);
  const [absenceCounts, lateCounts] = await Promise.all([
    studentIds.length > 0
      ? prisma.attendanceRecord.groupBy({ by: ['studentId'], where: { studentId: { in: studentIds }, status: 'absent' }, _count: true })
      : Promise.resolve([]),
    studentIds.length > 0
      ? prisma.attendanceRecord.groupBy({ by: ['studentId'], where: { studentId: { in: studentIds }, status: 'late' }, _count: true })
      : Promise.resolve([]),
  ]);
  const absenceMap = Object.fromEntries(absenceCounts.map((a) => [a.studentId, a._count]));
  const lateMap = Object.fromEntries(lateCounts.map((a) => [a.studentId, a._count]));

  return activeSanctions.map((s) => ({
    'Student Name': `${s.student.firstName} ${s.student.lastName}`,
    'Student ID': s.student.studentId,
    'Course': s.student.course?.code ?? '',
    'Type': s.sanctionRule.type,
    'Sanction Level': s.sanctionRule.sanctionLevel,
    'Threshold': s.sanctionRule.absenceThreshold,
    'Actual Count': s.sanctionRule.type === 'late' ? (lateMap[s.studentId] || 0) : (absenceMap[s.studentId] || 0),
    'Status': s.status,
    'Triggered At': s.triggeredAt.toISOString(),
    'Resolved At': s.resolvedAt ? s.resolvedAt.toISOString() : '',
    'Notes': s.notes || '',
  }));
}

async function autoTriggerSanctions() {
  await ensureDefaultRules();
  const rules = await prisma.sanctionRule.findMany({
    where: { isActive: true },
    orderBy: [{ type: 'asc' }, { absenceThreshold: 'asc' }],
  });

  const absenceRules = rules.filter((r) => r.type === 'absence');
  const lateRules = rules.filter((r) => r.type === 'late');

  const [students, absenceCounts, lateCounts, existingSanctions] = await Promise.all([
    prisma.student.findMany({ select: { id: true } }),
    prisma.attendanceRecord.groupBy({
      by: ['studentId'],
      where: { status: 'absent' },
      _count: true,
    }),
    prisma.attendanceRecord.groupBy({
      by: ['studentId'],
      where: { status: 'late' },
      _count: true,
    }),
    prisma.sanction.findMany({
      where: { status: 'active' },
      select: { id: true, studentId: true, sanctionRuleId: true, sanctionRule: { select: { type: true, absenceThreshold: true } } },
    }),
  ]);

  const absenceMap = new Map(absenceCounts.map((a) => [a.studentId, a._count]));
  const lateMap = new Map(lateCounts.map((a) => [a.studentId, a._count]));

  const existingByStudent = {};
  for (const s of existingSanctions) {
    if (!existingByStudent[s.studentId]) existingByStudent[s.studentId] = {};
    existingByStudent[s.studentId][s.sanctionRule.type] = s;
  }

  const toCreate = [];
  const toUpdate = [];

  for (const student of students) {
    const absenceCount = absenceMap.get(student.id) || 0;
    const lateCount = lateMap.get(student.id) || 0;
    const existingMap = existingByStudent[student.id] || {};

    const bestAbsenceRule = findBestRule(absenceRules, absenceCount);
    if (bestAbsenceRule) {
      const existing = existingMap['absence'];
      if (!existing) {
        toCreate.push({ studentId: student.id, sanctionRuleId: bestAbsenceRule.id });
      } else if (existing.sanctionRuleId !== bestAbsenceRule.id && bestAbsenceRule.absenceThreshold > existing.sanctionRule.absenceThreshold) {
        toUpdate.push({ id: existing.id, sanctionRuleId: bestAbsenceRule.id });
      }
    }

    const bestLateRule = findBestRule(lateRules, lateCount);
    if (bestLateRule) {
      const existing = existingMap['late'];
      if (!existing) {
        toCreate.push({ studentId: student.id, sanctionRuleId: bestLateRule.id });
      } else if (existing.sanctionRuleId !== bestLateRule.id && bestLateRule.absenceThreshold > existing.sanctionRule.absenceThreshold) {
        toUpdate.push({ id: existing.id, sanctionRuleId: bestLateRule.id });
      }
    }
  }

  if (toCreate.length > 0) {
    await prisma.sanction.createMany({ data: toCreate });
  }
  for (const u of toUpdate) {
    await prisma.sanction.update({ where: { id: u.id }, data: { sanctionRuleId: u.sanctionRuleId, resolvedAt: null } });
  }

  return { created: toCreate.length, upgraded: toUpdate.length };
}

async function getFlaggedStudents() {
  const rules = await prisma.sanctionRule.findMany({
    where: { isActive: true },
    orderBy: [{ type: 'asc' }, { absenceThreshold: 'asc' }],
  });
  if (rules.length === 0) return [];

  const absenceRules = rules.filter((r) => r.type === 'absence');
  const lateRules = rules.filter((r) => r.type === 'late');

  const [students, activeSanctions, absenceCounts, lateCounts] = await Promise.all([
    prisma.student.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentId: true,
        course: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.sanction.findMany({
      where: { status: 'active' },
      select: { studentId: true, sanctionRule: { select: { type: true } } },
    }),
    prisma.attendanceRecord.groupBy({
      by: ['studentId'],
      where: { status: 'absent' },
      _count: true,
    }),
    prisma.attendanceRecord.groupBy({
      by: ['studentId'],
      where: { status: 'late' },
      _count: true,
    }),
  ]);

  const absenceMap = new Map(absenceCounts.map((a) => [a.studentId, a._count]));
  const lateMap = new Map(lateCounts.map((a) => [a.studentId, a._count]));

  const studentsWithAbsenceSanction = new Set(
    activeSanctions.filter((s) => s.sanctionRule.type === 'absence').map((s) => s.studentId)
  );
  const studentsWithLateSanction = new Set(
    activeSanctions.filter((s) => s.sanctionRule.type === 'late').map((s) => s.studentId)
  );

  const result = [];
  for (const student of students) {
    const absenceCount = absenceMap.get(student.id) || 0;
    const lateCount = lateMap.get(student.id) || 0;

    if (!studentsWithAbsenceSanction.has(student.id) && absenceRules.length > 0) {
      const lowestAbsenceThreshold = absenceRules[0].absenceThreshold;
      const flagAbsenceThreshold = Math.max(1, Math.floor(lowestAbsenceThreshold * 0.5));
      if (absenceCount >= flagAbsenceThreshold) {
        const nextRule = absenceRules.find((r) => absenceCount < r.absenceThreshold);
        result.push({
          student,
          type: 'absence',
          count: absenceCount,
          nextThreshold: nextRule ? nextRule.absenceThreshold : null,
          nextLevel: nextRule ? nextRule.sanctionLevel : null,
          nearestRule: nextRule || absenceRules[absenceRules.length - 1],
        });
      }
    }

    if (!studentsWithLateSanction.has(student.id) && lateRules.length > 0) {
      const lowestLateThreshold = lateRules[0].absenceThreshold;
      const flagLateThreshold = Math.max(1, Math.floor(lowestLateThreshold * 0.5));
      if (lateCount >= flagLateThreshold) {
        const nextRule = lateRules.find((r) => lateCount < r.absenceThreshold);
        result.push({
          student,
          type: 'late',
          count: lateCount,
          nextThreshold: nextRule ? nextRule.absenceThreshold : null,
          nextLevel: nextRule ? nextRule.sanctionLevel : null,
          nearestRule: nextRule || lateRules[lateRules.length - 1],
        });
      }
    }
  }

  return result.sort((a, b) => b.count - a.count);
}

module.exports = {
  listSanctionRules,
  getSanctionRule,
  createSanctionRule,
  updateSanctionRule,
  deleteSanctionRule,
  listSanctions,
  getSanction,
  getSanctionSummary,
  createSanction,
  updateSanction,
  getSanctionChanges,
  exportSanctions,
  autoTriggerSanctions,
  getFlaggedStudents,
};
