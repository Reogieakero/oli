const { z } = require('zod');

const createPaymentSchema = z.object({
  body: z.object({
    balanceId: z.string().uuid(),
    paymentMethodId: z.string().uuid(),
    amount: z.coerce.number().positive(),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
    proofReceipt: z.string().optional(),
  }),
});

const createPaymentMethodSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50),
    accountName: z.string().max(100).optional(),
    accountNumber: z.string().max(100).optional(),
    instructions: z.string().max(255).optional(),
  }),
});

const updatePaymentMethodSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    accountName: z.string().max(100).nullable().optional(),
    accountNumber: z.string().max(100).nullable().optional(),
    instructions: z.string().max(255).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});

module.exports = { createPaymentSchema, createPaymentMethodSchema, updatePaymentMethodSchema };
