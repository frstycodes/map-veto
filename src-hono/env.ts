import { z } from 'zod'

const serverEnvSchema = z.object({
  PORT: z.coerce.number().default(3001)
})

export const env = serverEnvSchema.parse(process.env)
