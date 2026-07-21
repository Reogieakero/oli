const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

const testCourseId = uuidv4();
const testEmail = `courses_${Date.now()}@test.com`;
const testStudentId = `CRS-${Date.now()}`;
const COURSE_CODE = `CS${Date.now() % 100000}`;

let facultyToken;
let studentToken;

beforeAll(async () => {
  await prisma.course.upsert({
    where: { id: testCourseId },
    update: {},
    create: { id: testCourseId, code: `CRSB${Date.now() % 100000}`, name: 'Courses Base Course' },
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
      firstName: 'Courses',
      lastName: 'Test',
      studentId: testStudentId,
      courseId: testCourseId,
      yearLevel: 1,
    });
  studentToken = regRes.body.accessToken;
});

afterAll(async () => {
  await prisma.student.deleteMany({ where: { user: { email: testEmail } } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.course.deleteMany({ where: { id: testCourseId } });
});

describe('Courses API', () => {
  let courseId;

  it('faculty can create a course', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ code: COURSE_CODE, name: 'Course 101' });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(COURSE_CODE);
    courseId = res.body.id;
  });

  it('student cannot create a course', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ code: 'STUDENTCRS', name: 'Student Course' });

    expect(res.status).toBe(403);
  });

  it('everyone can list courses', async () => {
    const res = await request(app)
      .get('/api/v1/courses')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects unauthorized access', async () => {
    const res = await request(app)
      .get('/api/v1/courses');

    expect(res.status).toBe(401);
  });

  it('rejects duplicate course code', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ code: COURSE_CODE, name: 'Duplicate' });

    expect(res.status).toBe(409);
  });
});
