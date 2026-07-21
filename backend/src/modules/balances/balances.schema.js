const { z } = require('zod');

const createBalanceSchema = z.object({
  body: z.object({
    studentId: z.string().uuid(),
    description: z.string().min(1),
    amount: z.number().positive(),
    dueDate: z.string().optional(),
  }),
});

module.exports = { createBalanceSchema };
