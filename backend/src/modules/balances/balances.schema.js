const { z } = require('zod');

const createBalanceSchema = z.object({
  body: z.object({
    studentId: z.string().uuid(),
    description: z.string().min(1),
    amount: z.number().positive(),
    dueDate: z.string().optional(),
  }),
});

const updateBalanceSchema = z.object({
  body: z.object({
    amount: z.number().positive().optional(),
    description: z.string().min(1).optional(),
    dueDate: z.string().nullable().optional(),
    status: z.enum(['unpaid', 'partial', 'paid']).optional(),
  }),
});

const listBalancesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.enum(['overdue', 'unpaid', 'partial', 'paid']).optional(),
    courseId: z.string().uuid().optional(),
    overdue: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

const createBalancesBulkSchema = z.object({
  body: z.object({
    description: z.string().min(1),
    amount: z.number().positive(),
    dueDate: z.string().optional(),
    courseId: z.string().uuid().optional(),
  }),
});

module.exports = { createBalanceSchema, updateBalanceSchema, listBalancesSchema, createBalancesBulkSchema };
