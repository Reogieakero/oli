const { z } = require('zod');

const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(150),
    description: z.string().nullable().optional(),
    venue: z.string().min(1).max(150),
    eventDate: z.string().refine(v => !isNaN(Date.parse(v)), 'Invalid date'),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    lateCutoffTime: z.number().int().min(0).default(15),
    isMandatory: z.boolean().default(false),
    courseId: z.string().uuid().nullable().optional(),
    targetYearLevel: z.number().int().min(1).max(6).nullable().optional(),
    passcodeExpiresAt: z.string().nullable().optional(),
  }),
});

module.exports = { createEventSchema };
