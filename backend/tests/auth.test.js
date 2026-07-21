const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const bcrypt = require('bcrypt');

beforeAll(async () => {
  await prisma.$connect();

  const facultyEmail = 'faculty@oli.edu';
  const existing = await prisma.user.findUnique({ where: { email: facultyEmail } });
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 12);
    await prisma.user.create({
      data: {
        email: facultyEmail,
        passwordHash: hash,
        role: 'faculty',
        faculty: { create: { fullName: 'Test Faculty' } },
      },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/v1/auth/register', () => {
  const testCourseId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    await prisma.course.upsert({
      where: { id: testCourseId },
      update: {},
      create: { id: testCourseId, code: 'TEST', name: 'Test Course' },
    });
  });

  afterAll(async () => {
    await prisma.student.deleteMany({ where: { courseId: testCourseId } });
    await prisma.course.deleteMany({ where: { id: testCourseId } });
  });

  afterEach(async () => {
    await prisma.student.deleteMany({
      where: { user: { email: { startsWith: 'test_' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test_' } },
    });
  });

  it('should register a student successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test_student@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Student',
        studentId: 'TEST-001',
        courseId: testCourseId,
        yearLevel: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('test_student@test.com');
    expect(res.body.user.role).toBe('student');
  });

  it('should reject duplicate email', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test_dup@test.com',
        password: 'password123',
        firstName: 'Dup',
        lastName: 'User',
        studentId: 'TEST-002',
        courseId: testCourseId,
        yearLevel: 1,
      });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test_dup@test.com',
        password: 'password123',
        firstName: 'Dup',
        lastName: 'User',
        studentId: 'TEST-003',
        courseId: testCourseId,
        yearLevel: 1,
      });

    expect(res.status).toBe(409);
  });

  it('should reject invalid input', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    const course = await prisma.course.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: { id: '00000000-0000-0000-0000-000000000002', code: 'TEST2', name: 'Test Course 2' },
    });

    const hash = await bcrypt.hash('password123', 12);
    await prisma.user.upsert({
      where: { email: 'test_login@test.com' },
      update: {},
      create: {
        email: 'test_login@test.com',
        passwordHash: hash,
        role: 'student',
        student: {
          create: {
            firstName: 'Login',
            lastName: 'Test',
            studentId: 'TEST-LOGIN',
            courseId: course.id,
            yearLevel: 1,
            qrCodeToken: 'test_qr_login_token',
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.student.deleteMany({ where: { user: { email: 'test_login@test.com' } } });
    await prisma.user.deleteMany({ where: { email: 'test_login@test.com' } });
    await prisma.course.deleteMany({ where: { code: 'TEST2' } });
  });

  it('should login successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test_login@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test_login@test.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  it('should reject non-existent email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/login/faculty', () => {
  it('should login faculty successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login/faculty')
      .send({ email: 'faculty@oli.edu', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.role).toBe('faculty');
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login/faculty')
      .send({ email: 'faculty@oli.edu', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('should refresh token successfully', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login/faculty')
      .send({ email: 'faculty@oli.edu', password: 'admin123' });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: loginRes.body.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('should reject invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalidtoken' });

    expect(res.status).toBe(401);
  });
});
