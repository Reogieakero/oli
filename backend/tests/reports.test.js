const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

const testCourseId = uuidv4();
const testEmail = `rpt_${Date.now()}@test.com`;
const testStudentId = `RPT-${Date.now()}`;

let facultyToken;
let studentToken;

beforeAll(async () => {
  await prisma.course.upsert({
    where: { id: testCourseId },
    update: {},
    create: { id: testCourseId, code: `RPT${Date.now() % 100000}`, name: 'Report Course' },
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
      firstName: 'Report',
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

describe('Reports API', () => {
  it('faculty can view event attendance report', async () => {
    const res = await request(app)
      .get('/api/v1/reports/events')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('faculty can view course attendance report', async () => {
    const res = await request(app)
      .get('/api/v1/reports/courses')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('student cannot access reports', async () => {
    const res = await request(app)
      .get('/api/v1/reports/events')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});
