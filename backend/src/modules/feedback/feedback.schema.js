const { z } = require('zod');

const createFeedbackSchema = z.object({
  body: z.object({
    subject: z.string().min(1).max(150),
    message: z.string().min(1),
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
