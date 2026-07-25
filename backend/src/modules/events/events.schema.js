const { z } = require('zod');

const toNum = (v) => (typeof v === 'string' && v !== '' ? parseFloat(v) : v);
const toBool = (v) => v === 'true' || v === true;

const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(150),
    description: z.string().nullable().optional(),
    importantNotice: z.string().nullable().optional(),
    venue: z.string().min(1).max(150),
    eventDate: z.string().refine(v => !isNaN(Date.parse(v)), 'Invalid date'),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    lateCutoffTime: z.preprocess(toNum, z.number().int().min(0)).default(15),
    isMandatory: z.preprocess(toBool, z.boolean()).default(false),
    courseId: z.string().uuid().nullable().optional(),
    targetYearLevel: z.preprocess(toNum, z.number().int().min(1).max(4)).nullable().optional(),
    programPasscode: z.string().min(1).max(10),
    passcodeExpiresAt: z.string().nullable().optional(),
  }),
});

const updateEventSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(150).optional(),
    description: z.string().nullable().optional(),
    importantNotice: z.string().nullable().optional(),
    venue: z.string().min(1).max(150).optional(),
    eventDate: z.string().refine(v => !isNaN(Date.parse(v)), 'Invalid date').optional(),
    startTime: z.string().min(1).optional(),
    endTime: z.string().min(1).optional(),
    lateCutoffTime: z.preprocess(toNum, z.number().int().min(0)).optional(),
    isMandatory: z.preprocess(toBool, z.boolean()).optional(),
    courseId: z.string().uuid().nullable().optional(),
    targetYearLevel: z.preprocess(toNum, z.number().int().min(1).max(4)).nullable().optional(),
    programPasscode: z.string().min(1).max(10).optional(),
    passcodeExpiresAt: z.string().nullable().optional(),
    isActive: z.preprocess(toBool, z.boolean()).optional(),
  }),
});

module.exports = { createEventSchema, updateEventSchema };
