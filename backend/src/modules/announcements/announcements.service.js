const prisma = require('../../config/database');
const supabase = require('../../config/supabase');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

const ATTACHMENT_BUCKET = 'announcement-attachments';

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === ATTACHMENT_BUCKET)) {
    await supabase.storage.createBucket(ATTACHMENT_BUCKET, { public: false });
  }
}

async function listAnnouncements(user, query = {}) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;
  const { status, courseId, search, startDate, endDate, sortBy, sortOrder } = query;

  let where = {};

  if (user.role === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: user.sub } });
    if (student) {
      where = {
        status: 'published',
        OR: [
          { isGeneral: true },
          { courseId: student.courseId, targetYearLevel: student.yearLevel },
          { courseId: student.courseId, targetYearLevel: null },
          { courseId: null, targetYearLevel: null },
        ],
      };
    }
  }

  if (status && user.role !== 'student') where.status = status;
  if (courseId) where.courseId = courseId;
  if (search) where.title = { contains: search, mode: 'insensitive' };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
  }

  const orderBy = {};
  orderBy[sortBy || 'createdAt'] = sortOrder || 'desc';

  const [data, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        attachments: true,
        course: { select: { id: true, code: true, name: true } },
        faculty: { select: { fullName: true } },
        _count: { select: { reads: true } },
      },
    }),
    prisma.announcement.count({ where }),
  ]);

  return { data, total, page, limit };
}

async function getAnnouncement(id) {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: {
      attachments: true,
      course: { select: { id: true, code: true, name: true } },
      faculty: { select: { fullName: true } },
      _count: { select: { reads: true } },
    },
  });
  if (!announcement) throw new NotFoundError('Announcement not found');
  return announcement;
}

async function createAnnouncement(userId, userEmail, data, files = []) {
  await ensureBucket();

  let faculty = await prisma.faculty.findUnique({ where: { userId } });
  if (!faculty) {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) throw new NotFoundError('User not found');
    faculty = await prisma.faculty.findUnique({ where: { userId: user.id } });
    if (!faculty) {
      faculty = await prisma.faculty.create({
        data: { userId: user.id, fullName: user.email },
      });
    }
  }

  const status = data.status || 'draft';
  const publishAt = data.publishAt ? new Date(data.publishAt) : null;
  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

  const announcement = await prisma.$transaction(async (tx) => {
    const ann = await tx.announcement.create({
      data: {
        facultyId: faculty.id,
        title: data.title,
        content: data.content,
        courseId: data.courseId || null,
        targetYearLevel: data.targetYearLevel || null,
        isGeneral: data.isGeneral || false,
        status,
        publishAt,
        expiresAt,
      },
    });

    if (files.length > 0) {
      const attachments = [];
      for (const file of files) {
        const filePath = `announcements/${ann.id}/${Date.now()}_${file.originalname}`;
        const { error: uploadError } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

        attachments.push({
          announcementId: ann.id,
          fileName: file.originalname,
          fileUrl: filePath,
          fileSize: file.size,
          mimeType: file.mimetype,
        });
      }
      await tx.announcementAttachment.createMany({ data: attachments });
    }

    return tx.announcement.findUnique({
      where: { id: ann.id },
      include: {
        attachments: true,
        course: { select: { id: true, code: true, name: true } },
        faculty: { select: { fullName: true } },
      },
    });
  });

  return announcement;
}

async function updateAnnouncement(id, facultyId, data, files = []) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Announcement not found');

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.courseId !== undefined) updateData.courseId = data.courseId || null;
  if (data.targetYearLevel !== undefined) updateData.targetYearLevel = data.targetYearLevel || null;
  if (data.isGeneral !== undefined) updateData.isGeneral = data.isGeneral;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.publishAt !== undefined) updateData.publishAt = data.publishAt ? new Date(data.publishAt) : null;
  if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.announcement.update({
      where: { id },
      data: updateData,
    });

    if (files.length > 0) {
      await ensureBucket();
      const attachments = [];
      for (const file of files) {
        const filePath = `announcements/${updated.id}/${Date.now()}_${file.originalname}`;
        const { error: uploadError } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

        attachments.push({
          announcementId: updated.id,
          fileName: file.originalname,
          fileUrl: filePath,
          fileSize: file.size,
          mimeType: file.mimetype,
        });
      }
      await tx.announcementAttachment.createMany({ data: attachments });
    }

    return tx.announcement.findUnique({
      where: { id: updated.id },
      include: {
        attachments: true,
        course: { select: { id: true, code: true, name: true } },
        faculty: { select: { fullName: true } },
      },
    });
  });
}

async function archiveAnnouncement(id) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Announcement not found');

  return prisma.announcement.update({
    where: { id },
    data: { status: 'archived' },
  });
}

async function deleteAnnouncement(id) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Announcement not found');

  await supabase.storage.from(ATTACHMENT_BUCKET).remove([`announcements/${id}`]);
  await prisma.announcement.delete({ where: { id } });
}

async function getAttachmentSignedUrl(fileUrl) {
  const { data } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(fileUrl, 3600);
  return data?.signedUrl || null;
}

async function markAsRead(announcementId, studentId) {
  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement) throw new NotFoundError('Announcement not found');

  await prisma.announcementRead.upsert({
    where: { uq_announcement_read: { announcementId, studentId } },
    update: { readAt: new Date() },
    create: { announcementId, studentId },
  });
}

async function getReadCount(announcementId) {
  return prisma.announcementRead.count({ where: { announcementId } });
}

module.exports = {
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  archiveAnnouncement,
  deleteAnnouncement,
  getAttachmentSignedUrl,
  markAsRead,
  getReadCount,
};
