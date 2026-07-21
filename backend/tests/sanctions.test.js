const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

const testCourseId = uuidv4();
const testEmail = `sanc_${Date.now()}@test.com`;
const testStudentId = `SAN-${Date.now()}`;
const UNIQUE_THRESHOLD = 99 + (Date.now() % 10);

let facultyToken;
let studentToken;
let createdRuleId;

beforeAll(async () => {
  await prisma.course.upsert({
    where: { id: testCourseId },
    update: {},
    create: { id: testCourseId, code: `SAN${Date.now() % 100000}`, name: 'Sanctions Course' },
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
      firstName: 'Sanction',
      lastName: 'Test',
      studentId: testStudentId,
      courseId: testCourseId,
      yearLevel: 1,
    });
  studentToken = regRes.body.accessToken;
});

afterAll(async () => {
  if (createdRuleId) {
    await prisma.sanctionRule.deleteMany({ where: { id: createdRuleId } }).catch(() => {});
  }
  await prisma.student.deleteMany({ where: { user: { email: testEmail } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: testEmail } }).catch(() => {});
  await prisma.course.deleteMany({ where: { id: testCourseId } }).catch(() => {});
});

describe('Sanctions API', () => {
  it('faculty can create a sanction rule', async () => {
    const res = await request(app)
      .post('/api/v1/sanctions/rules')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        absenceThreshold: UNIQUE_THRESHOLD,
        sanctionLevel: 'Expulsion',
        description: 'Expelled after absences',
      });

    expect(res.status).toBe(201);
    expect(res.body.absenceThreshold).toBe(UNIQUE_THRESHOLD);
    createdRuleId = res.body.id;
  });

  it('faculty can list sanction rules', async () => {
    const res = await request(app)
      .get('/api/v1/sanctions/rules')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('student cannot create a sanction rule', async () => {
    const res = await request(app)
      .post('/api/v1/sanctions/rules')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ absenceThreshold: 99, sanctionLevel: 'Test' });

    expect(res.status).toBe(403);
  });
});
