const prisma = require('../../config/database');
const supabase = require('../../config/supabase');
const { NotFoundError, ValidationError, AppError } = require('../../utils/errors');
const crypto = require('crypto');

const COVER_BUCKET = 'event-cover-photos';

function generatePasscode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === COVER_BUCKET)) {
    await supabase.storage.createBucket(COVER_BUCKET, { public: false });
  }
}

async function uploadCover(file) {
  if (!file) return null;
  await ensureBucket();
  const filePath = `covers/${Date.now()}_${file.originalname}`;
  const { error } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(filePath, file.buffer, { contentType: file.mimetype });
  if (error) throw new AppError(`Cover upload failed: ${error.message}`, 400);
  return { coverPhoto: filePath, coverPhotoFileName: file.originalname };
}

async function deleteCover(filePath) {
  if (!filePath) return;
  await supabase.storage.from(COVER_BUCKET).remove([filePath]);
}

async function listEvents(user, page = 1, limit = 20, courseId) {
  const skip = (page - 1) * limit;
  let where = {};

  if (courseId) {
    where.courseId = courseId;
  }

  if (user.role === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: user.sub } });
    if (student) {
      where = {
        ...where,
        OR: [
          { courseId: student.courseId, targetYearLevel: student.yearLevel },
          { courseId: student.courseId, targetYearLevel: null },
          { courseId: null },
        ],
      };
    }
  }

  const [data, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { eventDate: 'desc' },
      include: {
        course: { select: { code: true, name: true } },
        faculty: { select: { fullName: true } },
        _count: { select: { attendanceRecords: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return { data, total, page, limit };
}

async function getEvent(id) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      course: { select: { code: true, name: true } },
      faculty: { select: { fullName: true } },
      _count: { select: { attendanceRecords: true } },
    },
  });
  if (!event) throw new NotFoundError('Event not found');
  return event;
}

async function createEvent(userId, data, coverFile) {
  const programPasscode = data.programPasscode || generatePasscode();

  const eventDate = new Date(data.eventDate);
  const startTime = new Date(`1970-01-01T${data.startTime}`);
  const endTime = new Date(`1970-01-01T${data.endTime}`);
  const passcodeExpiresAt = data.passcodeExpiresAt ? new Date(data.passcodeExpiresAt) : null;

  if (passcodeExpiresAt && passcodeExpiresAt <= new Date()) {
    throw new ValidationError('Passcode expiry must be in the future');
  }

  const faculty = await prisma.faculty.findUnique({ where: { userId } });
  if (!faculty) throw new NotFoundError('Faculty profile not found');

  const cover = await uploadCover(coverFile);

  const event = await prisma.$transaction(async (tx) => {
    const newEvent = await tx.event.create({
      data: {
        facultyId: faculty.id,
        title: data.title,
        description: data.description || null,
        importantNotice: data.importantNotice || null,
        coverPhoto: cover?.coverPhoto || null,
        coverPhotoFileName: cover?.coverPhotoFileName || null,
        venue: data.venue,
        eventDate,
        startTime,
        endTime,
        lateCutoffTime: data.lateCutoffTime,
        isMandatory: data.isMandatory,
        courseId: data.courseId || null,
        targetYearLevel: data.targetYearLevel || null,
        programPasscode,
        passcodeExpiresAt,
        isActive: true,
      },
    });

    return newEvent;
  });

  return event;
}

async function updateEvent(id, data, coverFile) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Event not found');

  const updateData = { ...data };
  if (updateData.eventDate) updateData.eventDate = new Date(updateData.eventDate);
  if (updateData.startTime) updateData.startTime = new Date(`1970-01-01T${updateData.startTime}`);
  if (updateData.endTime) updateData.endTime = new Date(`1970-01-01T${updateData.endTime}`);
  if (updateData.passcodeExpiresAt) {
    const expiry = new Date(updateData.passcodeExpiresAt);
    if (expiry <= new Date()) {
      throw new ValidationError('Passcode expiry must be in the future');
    }
    updateData.passcodeExpiresAt = expiry;
  }

  if (coverFile) {
    await deleteCover(existing.coverPhoto);
    const cover = await uploadCover(coverFile);
    updateData.coverPhoto = cover.coverPhoto;
    updateData.coverPhotoFileName = cover.coverPhotoFileName;
  }

  if (updateData.importantNotice === '') {
    updateData.importantNotice = null;
  }

  if (updateData.coverPhoto === '') {
    await deleteCover(existing.coverPhoto);
    updateData.coverPhoto = null;
    updateData.coverPhotoFileName = null;
  }

  return prisma.event.update({ where: { id }, data: updateData });
}

async function deleteEvent(id) {
  const existing = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { attendanceRecords: true } } },
  });
  if (!existing) throw new NotFoundError('Event not found');
  await prisma.attendanceRecord.deleteMany({ where: { eventId: id } });
  try {
    await deleteCover(existing.coverPhoto);
  } catch {
    // best-effort: proceed even if cover photo deletion fails
  }
  await prisma.event.delete({ where: { id } });
}

async function getCoverSignedUrl(id) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new NotFoundError('Event not found');
  if (!event.coverPhoto) return null;
  const { data } = await supabase.storage
    .from(COVER_BUCKET)
    .createSignedUrl(event.coverPhoto, 3600);
  return data?.signedUrl || null;
}

module.exports = {
  listEvents, getEvent, createEvent, updateEvent, deleteEvent, getCoverSignedUrl,
};
