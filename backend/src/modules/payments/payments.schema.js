const { z } = require('zod');

const createPaymentSchema = z.object({
  body: z.object({
    balanceId: z.string().uuid(),
    paymentMethodId: z.string().uuid(),
    amount: z.number().positive(),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const createPaymentMethodSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50),
  }),
});

module.exports = { createPaymentSchema, createPaymentMethodSchema };
