const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

const testCourseId = uuidv4();
const testEmail = `aud_${Date.now()}@test.com`;
const testStudentId = `AUD-${Date.now()}`;

let facultyToken;
let studentToken;

beforeAll(async () => {
  await prisma.course.upsert({
    where: { id: testCourseId },
    update: {},
    create: { id: testCourseId, code: `AUD${Date.now() % 100000}`, name: 'Audit Course' },
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
      firstName: 'Audit',
      lastName: 'Test',
      studentId: testStudentId,
      courseId: testCourseId,
      yearLevel: 1,
    });
  studentToken = regRes.body.accessToken;
});

afterAll(async () => {
  await prisma.student.deleteMany({ where: { user: { email: testEmail } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: testEmail } }).catch(() => {});
  await prisma.course.deleteMany({ where: { id: testCourseId } }).catch(() => {});
});

describe('Audit Files API', () => {
  it('student can list audit files', async () => {
    const res = await request(app)
      .get('/api/v1/audit-files')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
  });

  it('faculty can list audit files', async () => {
    const res = await request(app)
      .get('/api/v1/audit-files')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
  });

  it('rejects unauthorized access', async () => {
    const res = await request(app)
      .get('/api/v1/audit-files');

    expect(res.status).toBe(401);
  });
});
