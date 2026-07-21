const { z } = require('zod');

const createSanctionRuleSchema = z.object({
  body: z.object({
    absenceThreshold: z.number().int().min(1),
    sanctionLevel: z.string().min(1).max(50),
    description: z.string().optional(),
  }),
});

const updateSanctionRuleSchema = z.object({
  body: z.object({
    absenceThreshold: z.number().int().min(1).optional(),
    sanctionLevel: z.string().min(1).max(50).optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

module.exports = { createSanctionRuleSchema, updateSanctionRuleSchema };
