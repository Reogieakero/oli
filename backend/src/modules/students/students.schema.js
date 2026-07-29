const { z } = require('zod');

const completeProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    studentId: z.string().regex(/^20\d{2}-\d{4}$/, 'Student ID must follow the format 20xx-xxxx (e.g. 2024-0001)'),
    courseId: z.string().uuid('Invalid course'),
    yearLevel: z.number().int().min(1).max(4),
  }),
});

module.exports = { completeProfileSchema };
