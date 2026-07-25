const { z } = require('zod');

const listRecordsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    eventId: z.string().uuid().optional(),
    status: z.enum(['present', 'late', 'absent']).optional(),
    courseId: z.string().uuid().optional(),
    eventCourseId: z.string().uuid().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

const updateRecordSchema = z.object({
  body: z.object({
    status: z.enum(['present', 'late', 'absent']),
    reason: z.string().max(500).optional(),
  }),
});

const createRecordSchema = z.object({
  body: z.object({
    studentId: z.string().uuid(),
    eventId: z.string().uuid(),
    status: z.enum(['present', 'late', 'absent']),
    scannedAt: z.string().datetime().optional(),
    reason: z.string().max(500).optional(),
  }),
});

const deleteRecordSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

module.exports = { listRecordsSchema, updateRecordSchema, createRecordSchema, deleteRecordSchema };
