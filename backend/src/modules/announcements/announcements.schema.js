const { z } = require('zod');

const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(150),
    content: z.string().min(1),
    courseId: z.string().uuid().nullable().optional(),
    targetYearLevel: z.number().int().min(1).max(6).nullable().optional(),
    isGeneral: z.boolean().optional(),
  }),
});

const updateAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(150).optional(),
    content: z.string().min(1).optional(),
    courseId: z.string().uuid().nullable().optional(),
    targetYearLevel: z.number().int().min(1).max(6).nullable().optional(),
    isGeneral: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

module.exports = { createAnnouncementSchema, updateAnnouncementSchema };
