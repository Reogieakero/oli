const prisma = require('../../config/database');
const supabase = require('../../config/supabase');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

const ATTACHMENT_BUCKET = 'announcement-attachments';

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === ATTACHMENT_BUCKET)) {
    await supabase.storage.createBucket(ATTACHMENT_BUCKET, {
      public: false,
    });
  }
}

async function listAnnouncements(user, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  let where = {};

  if (user.role === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: user.sub } });
    if (student) {
      where = {
        OR: [
          { isGeneral: true },
          { courseId: student.courseId, targetYearLevel: student.yearLevel },
          { courseId: student.courseId, targetYearLevel: null },
        ],
      };
    }
  }

  const [data, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { attachments: true, course: true, faculty: { select: { fullName: true } } },
    }),
    prisma.announcement.count({ where }),
  ]);

  return { data, total, page, limit };
}

async function getAnnouncement(id) {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: { attachments: true, course: true, faculty: { select: { fullName: true } } },
  });
  if (!announcement) throw new NotFoundError('Announcement not found');
  return announcement;
}

async function createAnnouncement(userId, data, files = []) {
  await ensureBucket();

  const faculty = await prisma.faculty.findUnique({ where: { userId } });
  if (!faculty) throw new NotFoundError('Faculty profile not found');

  const announcement = await prisma.$transaction(async (tx) => {
    const ann = await tx.announcement.create({
      data: {
        facultyId: faculty.id,
        title: data.title,
        content: data.content,
        courseId: data.courseId || null,
        targetYearLevel: data.targetYearLevel || null,
        isGeneral: data.isGeneral || false,
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
      include: { attachments: true },
    });
  });

  return announcement;
}

async function updateAnnouncement(id, facultyId, data) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Announcement not found');

  return prisma.announcement.update({
    where: { id },
    data: {
      title: data.title,
      content: data.content,
      courseId: data.courseId !== undefined ? data.courseId : existing.courseId,
      targetYearLevel: data.targetYearLevel !== undefined ? data.targetYearLevel : existing.targetYearLevel,
      isGeneral: data.isGeneral !== undefined ? data.isGeneral : existing.isGeneral,
    },
    include: { attachments: true },
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

module.exports = {
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAttachmentSignedUrl,
};
