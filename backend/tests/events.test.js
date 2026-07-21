const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

const testCourseId = uuidv4();
const testEmail = `events_${Date.now()}@test.com`;
const testStudentId = `EVT-${Date.now()}`;

let facultyToken;
let studentToken;
let eventId;

beforeAll(async () => {
  await prisma.course.upsert({
    where: { id: testCourseId },
    update: {},
    create: { id: testCourseId, code: `EV${Date.now() % 100000}`, name: 'Events Test Course' },
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
      firstName: 'Events',
      lastName: 'Test',
      studentId: testStudentId,
      courseId: testCourseId,
      yearLevel: 1,
    });
  studentToken = regRes.body.accessToken;
});

afterAll(async () => {
  if (eventId) await prisma.attendanceRecord.deleteMany({ where: { eventId } }).catch(() => {});
  await prisma.student.deleteMany({ where: { user: { email: testEmail } } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.course.deleteMany({ where: { id: testCourseId } });
});

describe('Events API', () => {
  it('faculty can create an event', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        title: 'Test Event',
        venue: 'Room 101',
        eventDate: '2026-08-01',
        startTime: '09:00:00',
        endTime: '11:00:00',
        isMandatory: false,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('programPasscode');
    expect(res.body.title).toBe('Test Event');
    eventId = res.body.id;
  });

  it('student can list events', async () => {
    const res = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('student cannot create an event', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Student Event',
        venue: 'Room 102',
        eventDate: '2026-08-01',
        startTime: '09:00:00',
        endTime: '11:00:00',
      });

    expect(res.status).toBe(403);
  });

  it('rejects expired token', async () => {
    const res = await request(app)
      .get('/api/v1/events')
      .set('Authorization', 'Bearer expiredtoken');

    expect(res.status).toBe(401);
  });
});
