const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');

async function listFeedback(user, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = user.role === 'student' ? { userId: user.sub } : {};

  const [data, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: user.role === 'faculty'
        ? { user: { select: { email: true, student: { select: { firstName: true, lastName: true } } } } }
        : {},
    }),
    prisma.feedback.count({ where }),
  ]);

  return { data, total, page, limit };
}

async function createFeedback(userId, data) {
  return prisma.feedback.create({
    data: {
      userId,
      subject: data.subject,
      message: data.message,
      isAnonymous: data.isAnonymous || false,
    },
  });
}

async function respondToFeedback(id, response) {
  const feedback = await prisma.feedback.findUnique({ where: { id } });
  if (!feedback) throw new NotFoundError('Feedback not found');

  return prisma.feedback.update({
    where: { id },
    data: {
      response,
      respondedAt: new Date(),
    },
  });
}

module.exports = { listFeedback, createFeedback, respondToFeedback };
