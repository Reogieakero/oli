const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

const testCourseId = uuidv4();
const testEmail = `att_${Date.now()}@test.com`;
const testStudentId = `ATT-${Date.now()}`;
const PASSCODE = String(Math.floor(100000 + Math.random() * 900000));

let facultyToken;
let studentToken;
let eventId;
let qrCodeToken;

beforeAll(async () => {
  await prisma.course.upsert({
    where: { id: testCourseId },
    update: {},
    create: { id: testCourseId, code: `AT${Date.now() % 100000}`, name: 'Attendance Test Course' },
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
      firstName: 'Attendance',
      lastName: 'Test',
      studentId: testStudentId,
      courseId: testCourseId,
      yearLevel: 1,
    });
  studentToken = regRes.body.accessToken;
  qrCodeToken = regRes.body.user.student.qrCodeToken;

  const eventRes = await request(app)
    .post('/api/v1/events')
    .set('Authorization', `Bearer ${facultyToken}`)
    .send({
      title: 'Attendance Test Event',
      venue: 'Auditorium',
      eventDate: new Date(Date.now() - 60000).toISOString().split('T')[0],
      startTime: new Date(Date.now() - 300000).toISOString().substring(11, 19),
      endTime: new Date(Date.now() + 7200000).toISOString().substring(11, 19),
      isMandatory: true,
      courseId: testCourseId,
      targetYearLevel: 1,
      programPasscode: PASSCODE,
    });

  eventId = eventRes.body.id;
  await prisma.event.update({
    where: { id: eventId },
    data: { programPasscode: PASSCODE },
  });
});

afterAll(async () => {
  if (eventId) {
    await prisma.dispute.deleteMany({ where: { attendanceRecord: { eventId } } }).catch(() => {});
    await prisma.attendanceRecord.deleteMany({ where: { eventId } }).catch(() => {});
    await prisma.event.deleteMany({ where: { id: eventId } }).catch(() => {});
  }
  await prisma.student.deleteMany({ where: { user: { email: testEmail } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: testEmail } }).catch(() => {});
  await prisma.course.deleteMany({ where: { id: testCourseId } }).catch(() => {});
});

describe('Attendance Scan API', () => {
  it('should activate session with valid passcode', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/activate')
      .send({ passcode: PASSCODE });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it('should reject invalid passcode', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/activate')
      .send({ passcode: '000000' });

    expect(res.status).toBe(404);
  });

  it('should scan attendance successfully', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/scan')
      .send({
        passcode: PASSCODE,
        qrCodeToken,
        scannerDeviceId: 'test-device-001',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('present');
    expect(res.body.student).toBeDefined();
  });

  it('should reject duplicate scan', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/scan')
      .send({
        passcode: PASSCODE,
        qrCodeToken,
        scannerDeviceId: 'test-device-001',
      });

    expect(res.status).toBe(409);
  });

  it('should reject scan with invalid qr code', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/scan')
      .send({
        passcode: PASSCODE,
        qrCodeToken: 'nonexistent-token',
      });

    expect(res.status).toBe(404);
  });

  it('student can view their attendance history', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/history')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('student can view their sanction status', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/sanctions')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('absenceCount');
  });
});
