const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(100),
});

module.exports = { loginSchema };
