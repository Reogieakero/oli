const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

const testCourseId = uuidv4();
const testEmail = `fb_${Date.now()}@test.com`;
const testStudentId = `FB-${Date.now()}`;

let facultyToken;
let studentToken;

beforeAll(async () => {
  await prisma.course.upsert({
    where: { id: testCourseId },
    update: {},
    create: { id: testCourseId, code: `FB${Date.now() % 100000}`, name: 'Feedback Course' },
  });

  const facRes = await request(app)
    .post('/api/v1/auth/login/faculty')
    .send({ email: 'faculty@oli.edu', password: 'admin123' });
  facultyToken = facRes.body.accessToken;

  const regRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: testEmail,
      password: 'password123',
      firstName: 'Feedback',
      lastName: 'Test',
      studentId: testStudentId,
      courseId: testCourseId,
      yearLevel: 1,
    });
  studentToken = regRes.body.accessToken;
});

afterAll(async () => {
  await prisma.feedback.deleteMany({ where: { userId: { in: (await prisma.user.findMany({ where: { email: testEmail }, select: { id: true } })).map(u => u.id) } } }).catch(() => {});
  await prisma.student.deleteMany({ where: { user: { email: testEmail } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: testEmail } }).catch(() => {});
  await prisma.course.deleteMany({ where: { id: testCourseId } }).catch(() => {});
});

describe('Feedback API', () => {
  let feedbackId;

  it('student can submit feedback', async () => {
    const res = await request(app)
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        subject: 'Suggestion',
        message: 'Great system!',
        isAnonymous: true,
      });

    expect(res.status).toBe(201);
    feedbackId = res.body.id;
  });

  it('faculty can list all feedback', async () => {
    const res = await request(app)
      .get('/api/v1/feedback')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('faculty can respond to feedback', async () => {
    const res = await request(app)
      .put(`/api/v1/feedback/${feedbackId}/respond`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ response: 'Thank you for your feedback!' });

    expect(res.status).toBe(200);
    expect(res.body.response).toBe('Thank you for your feedback!');
  });

  it('student cannot respond to feedback', async () => {
    const res = await request(app)
      .put(`/api/v1/feedback/${feedbackId}/respond`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ response: 'Unauthorized response' });

    expect(res.status).toBe(403);
  });
});
