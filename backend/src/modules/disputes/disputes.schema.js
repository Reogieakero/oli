const { z } = require('zod');

const createDisputeSchema = z.object({
  body: z.object({
    attendanceRecordId: z.string().uuid(),
    reason: z.string().min(1),
  }),
});

const resolveDisputeSchema = z.object({
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    facultyNotes: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

module.exports = { createDisputeSchema, resolveDisputeSchema };
