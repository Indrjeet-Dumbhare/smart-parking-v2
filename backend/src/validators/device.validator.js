const { z } = require('zod');

// Example body sent by the ESP32:
// { "readings": [ { "slot": "A1", "status": "occupied" }, { "slot": "A2", "status": "free" } ] }
const readingsSchema = z.object({
  readings: z
    .array(
      z.object({
        slot: z.string().trim().min(1).max(20),
        status: z.enum(['free', 'occupied']),
      })
    )
    .min(1)
    .max(50),
});

module.exports = { readingsSchema };
