import { z } from 'zod/v4-mini'

const envSchema = z.object({
  VITE_SERVER_URL: z._default(z.optional(z.string()), location.origin)
})

export const env = envSchema.parse(import.meta.env)
