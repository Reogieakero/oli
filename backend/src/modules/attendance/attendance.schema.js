const { z } = require('zod');

const scanSchema = z.object({
  body: z.object({
    passcode: z.string().length(6),
    qrCodeToken: z.string().min(1),
    scannerDeviceId: z.string().optional(),
    scannedAt: z.string().datetime().optional(),
  }),
});

const activateSchema = z.object({
  body: z.object({
    passcode: z.string().length(6),
  }),
});

module.exports = { scanSchema, activateSchema };
