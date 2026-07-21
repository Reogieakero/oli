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

async function listAuditFiles(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.auditFile.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { faculty: { select: { fullName: true } } },
    }),
    prisma.auditFile.count(),
  ]);

  return { data, total, page, limit };
}

async function getAuditFile(id) {
  const file = await prisma.auditFile.findUnique({ where: { id } });
  if (!file) throw new NotFoundError('Audit file not found');
  return file;
}

async function uploadAuditFile(userId, { title, description, file }) {
  await ensureBucket();

  const faculty = await prisma.faculty.findUnique({ where: { userId } });
  if (!faculty) throw new NotFoundError('Faculty profile not found');

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
      fileName: file.originalname,
      fileUrl: filePath,
      fileSize: file.size,
      mimeType: file.mimetype,
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
