const prisma = require('../../config/database');
const supabase = require('../../config/supabase');
const { NotFoundError, ConflictError } = require('../../utils/errors');

const AVATAR_BUCKET = 'student-avatars';

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === AVATAR_BUCKET)) {
    await supabase.storage.createBucket(AVATAR_BUCKET, { public: false });
  }
}

function isProfileComplete(student) {
  return Boolean(
    student.firstName &&
    student.lastName &&
    student.studentId &&
    student.courseId &&
    student.yearLevel &&
    student.avatarUrl
  );
}

async function uploadAvatar(userId, file) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new NotFoundError('Student not found');

  await ensureBucket();

  const ext = (file.originalname.match(/\.([^.]+)$/) || [])[1] || 'bin';
  const filePath = `avatars/${userId}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file.buffer, { contentType: file.mimetype });

  if (uploadError) throw new Error(`Avatar upload failed: ${uploadError.message}`);

  const updated = await prisma.student.update({
    where: { userId },
    data: { avatarUrl: filePath },
  });

  return { avatarUrl: updated.avatarUrl };
}

async function getAvatarUrl(fileUrl) {
  const { data } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(fileUrl, 3600);
  return data?.signedUrl || null;
}

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
        user: { select: { email: true, isSuspended: true } },
        course: { select: { id: true, code: true, name: true } },
        _count: { select: { attendanceRecords: true, sanctions: true, balances: true, disputes: true } },
      },
    }),
    prisma.student.count({ where }),
  ]);

  return { data, total, page, limit };
}

async function getProfile(userId) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      course: { select: { id: true, code: true, name: true } },
      user: { select: { email: true } },
      _count: {
        select: {
          attendanceRecords: true,
          sanctions: { where: { status: 'active' } },
          balances: { where: { status: { in: ['unpaid', 'partial'] } } },
          disputes: { where: { status: 'pending' } },
        },
      },
    },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  return {
    id: student.id,
    userId: student.userId,
    firstName: student.firstName,
    lastName: student.lastName,
    studentId: student.studentId,
    yearLevel: student.yearLevel,
    email: student.user.email,
    course: student.course,
    avatarUrl: student.avatarUrl,
    profileComplete: isProfileComplete(student),
    stats: {
      totalAttendance: student._count.attendanceRecords,
      activeSanctions: student._count.sanctions,
      outstandingBalances: student._count.balances,
      pendingDisputes: student._count.disputes,
    },
    qrCodeToken: student.qrCodeToken,
    qrRegeneratedAt: student.qrRegeneratedAt,
  };
}

async function updateProfile(userId, data) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new NotFoundError('Student not found');

  if (data.studentId && data.studentId !== student.studentId) {
    const existing = await prisma.student.findFirst({
      where: { studentId: data.studentId, NOT: { userId } },
    });
    if (existing) throw new ConflictError('Student ID already exists');
  }

  const updateData = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.studentId !== undefined) updateData.studentId = data.studentId;
  if (data.courseId !== undefined) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) throw new NotFoundError('Course not found');
    updateData.courseId = data.courseId;
  }
  if (data.yearLevel !== undefined) updateData.yearLevel = data.yearLevel;

  const updated = await prisma.student.update({
    where: { userId },
    data: updateData,
    include: { course: true, user: { select: { email: true } } },
  });

  return {
    id: updated.id,
    firstName: updated.firstName,
    lastName: updated.lastName,
    studentId: updated.studentId,
    yearLevel: updated.yearLevel,
    email: updated.user.email,
    course: updated.course,
    avatarUrl: updated.avatarUrl,
    qrCodeToken: updated.qrCodeToken,
  };
}

async function regenerateQr(userId) {
  const crypto = require('crypto');
  const token = crypto.randomUUID();
  const updated = await prisma.student.update({
    where: { userId },
    data: {
      qrCodeToken: token,
      qrRegeneratedAt: new Date(),
    },
  });
  return { qrCodeToken: updated.qrCodeToken, qrRegeneratedAt: updated.qrRegeneratedAt };
}

async function setSuspended(studentId, suspended) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: { select: { role: true } } },
  });
  if (!student) throw new NotFoundError('Student not found');
  if (student.user.role !== 'student') throw new ConflictError('Only student accounts can be suspended');

  const updated = await prisma.user.update({
    where: { id: student.userId },
    data: { isSuspended: suspended },
  });

  return { id: student.id, isSuspended: updated.isSuspended };
}

module.exports = {
  completeProfile,
  listStudents,
  getProfile,
  updateProfile,
  regenerateQr,
  uploadAvatar,
  getAvatarUrl,
  setSuspended,
};
