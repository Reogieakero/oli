const { z } = require('zod');

const scanSchema = z.object({
  body: z.object({
    passcode: z.string().length(6),
    qrCodeToken: z.string().min(1),
    scannerDeviceId: z.string().optional(),
  }),
});

const activateSchema = z.object({
  body: z.object({
    passcode: z.string().length(6),
  }),
});

module.exports = { scanSchema, activateSchema };
