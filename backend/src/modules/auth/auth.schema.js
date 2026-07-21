const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6).max(100),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    studentId: z.string().min(1).max(20),
    courseId: z.string().uuid(),
    yearLevel: z.number().int().min(1).max(6),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

module.exports = { registerSchema, loginSchema, refreshSchema };
