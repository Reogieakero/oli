const { z } = require('zod');

const coerceBoolean = z.preprocess((v) => {
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return undefined;
}, z.boolean());

const coerceNumber = z.preprocess((v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}, z.number().int().nullable());

const coerceDate = z.preprocess((v) => {
  if (v == null || v === '') return null;
  return v;
}, z.string().nullable());

const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(150),
    content: z.string().min(1),
    courseId: z.string().uuid().nullable().optional(),
    targetYearLevel: coerceNumber.optional(),
    isGeneral: coerceBoolean.optional(),
    status: z.enum(['draft', 'published']).optional(),
    publishAt: coerceDate.optional(),
    expiresAt: coerceDate.optional(),
  }),
});

const updateAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(150).optional(),
    content: z.string().min(1).optional(),
    courseId: z.string().uuid().nullable().optional(),
    targetYearLevel: coerceNumber.optional(),
    isGeneral: coerceBoolean.optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    publishAt: coerceDate.optional(),
    expiresAt: coerceDate.optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

module.exports = { createAnnouncementSchema, updateAnnouncementSchema };
