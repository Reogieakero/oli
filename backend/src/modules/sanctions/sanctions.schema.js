const { z } = require('zod');

const createSanctionRuleSchema = z.object({
  body: z.object({
    type: z.enum(['absence', 'late']).default('absence'),
    absenceThreshold: z.number().int().min(1),
    sanctionLevel: z.string().min(1).max(50),
    description: z.string().optional(),
  }),
});

const updateSanctionRuleSchema = z.object({
  body: z.object({
    type: z.enum(['absence', 'late']).optional(),
    absenceThreshold: z.number().int().min(1).optional(),
    sanctionLevel: z.string().min(1).max(50).optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

const createSanctionSchema = z.object({
  body: z.object({
    studentId: z.string().uuid(),
    sanctionRuleId: z.string().uuid(),
    notes: z.string().optional(),
  }),
});

const updateSanctionSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'superseded', 'lifted']).optional(),
    notes: z.string().nullable().optional(),
    reason: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

module.exports = { createSanctionRuleSchema, updateSanctionRuleSchema, createSanctionSchema, updateSanctionSchema };
