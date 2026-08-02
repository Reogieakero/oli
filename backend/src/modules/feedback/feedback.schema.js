const { z } = require('zod');

const createFeedbackSchema = z.object({
  body: z.object({
    category: z.enum(['system', 'faculty']).default('system'),
    subject: z.string().max(150).optional(),
    message: z.string().min(1).max(5000),
    isAnonymous: z.boolean().optional(),
  }),
});

const respondToFeedbackSchema = z.object({
  body: z.object({
    response: z.string().min(1),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

module.exports = { createFeedbackSchema, respondToFeedbackSchema };
