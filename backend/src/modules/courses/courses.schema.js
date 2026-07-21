const { z } = require('zod');

const createCourseSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(20),
    name: z.string().min(1).max(100),
  }),
});

const updateCourseSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

module.exports = { createCourseSchema, updateCourseSchema };
