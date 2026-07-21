const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

const testCourseId = uuidv4();
const testEmail = `pay_${Date.now()}@test.com`;
const testStudentId = `PAY-${Date.now()}`;

let facultyToken;
let studentUuid;
let balanceId;
let methodId;

beforeAll(async () => {
  await prisma.course.upsert({
    where: { id: testCourseId },
    update: {},
    create: { id: testCourseId, code: `PAY${Date.now() % 100000}`, name: 'Payments Course' },
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
      firstName: 'Payment',
      lastName: 'Test',
      studentId: testStudentId,
      courseId: testCourseId,
      yearLevel: 1,
    });

  studentUuid = regRes.body.user.student.id;
});

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { balanceId } }).catch(() => {});
  await prisma.balance.deleteMany({ where: { id: balanceId } }).catch(() => {});
  await prisma.paymentMethod.deleteMany({ where: { id: methodId } }).catch(() => {});
  await prisma.student.deleteMany({ where: { user: { email: testEmail } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: testEmail } }).catch(() => {});
  await prisma.course.deleteMany({ where: { id: testCourseId } }).catch(() => {});
});

describe('Payments API', () => {
  it('faculty can create a payment method', async () => {
    const res = await request(app)
      .post('/api/v1/payments/methods')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ name: `Bank-${Date.now() % 10000}` });

    expect(res.status).toBe(201);
    methodId = res.body.id;
  });

  it('anyone can list payment methods', async () => {
    const res = await request(app)
      .get('/api/v1/payments/methods')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('faculty can create a balance', async () => {
    const res = await request(app)
      .post('/api/v1/balances')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        studentId: studentUuid,
        description: 'Tuition fee',
        amount: 5000,
      });

    expect(res.status).toBe(201);
    balanceId = res.body.id;
  });

  it('faculty can record a payment and update balance status', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        balanceId,
        paymentMethodId: methodId,
        amount: 5000,
        referenceNo: 'REF-001',
      });

    expect(res.status).toBe(201);

    const balance = await prisma.balance.findUnique({ where: { id: balanceId } });
    expect(balance.status).toBe('paid');
  });
});
