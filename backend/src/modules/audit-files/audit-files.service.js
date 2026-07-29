const prisma = require('../../config/database');
const supabase = require('../../config/supabase');
const { NotFoundError } = require('../../utils/errors');

const BUCKET = 'audit-files';

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: false });
  }
}

async function listAuditFiles(params = {}) {
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 20;
  const { search, category, courseId, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where = {};
  if (search) where.OR = [
    { title: { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } },
  ];
  if (category) where.category = category;
  if (courseId) where.courseId = courseId;

  const orderBy = {};
  orderBy[sortBy || 'createdAt'] = sortOrder || 'desc';

  const [data, total] = await Promise.all([
    prisma.auditFile.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        faculty: { select: { fullName: true } },
        course: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.auditFile.count({ where }),
  ]);

  return { data, total, page, limit };
}

async function getAuditFile(id) {
  const file = await prisma.auditFile.findUnique({
    where: { id },
    include: {
      faculty: { select: { fullName: true } },
      course: { select: { id: true, code: true, name: true } },
    },
  });
  if (!file) throw new NotFoundError('Audit file not found');
  return file;
}

async function uploadAuditFile(userId, userEmail, { title, description, category, courseId, file }) {
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

  const filePath = `audit/${Date.now()}_${file.originalname}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file.buffer, { contentType: file.mimetype });

  if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

  return prisma.auditFile.create({
    data: {
      facultyId: faculty.id,
      title,
      description: description || null,
      category: category || null,
      courseId: courseId || null,
      fileName: file.originalname,
      fileUrl: filePath,
      fileSize: file.size,
      mimeType: file.mimetype,
    },
    include: {
      course: { select: { id: true, code: true, name: true } },
    },
  });
}

async function deleteAuditFile(id) {
  const file = await prisma.auditFile.findUnique({ where: { id } });
  if (!file) throw new NotFoundError('Audit file not found');

  await supabase.storage.from(BUCKET).remove([file.fileUrl]);
  await prisma.auditFile.delete({ where: { id } });
}

async function getSignedUrl(fileUrl) {
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(fileUrl, 3600);
  return data?.signedUrl || null;
}

module.exports = { listAuditFiles, getAuditFile, uploadAuditFile, deleteAuditFile, getSignedUrl };
