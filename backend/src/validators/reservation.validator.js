const { z } = require('zod');

const createReservationSchema = z
  .object({
    slotId: z.coerce.number().int().positive(),
    facultyName: z.string().trim().min(2).max(100),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  })
  .refine((v) => v.endTime > new Date(), {
    message: 'End time must be in the future',
    path: ['endTime'],
  });

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = { createReservationSchema, idParamSchema };
