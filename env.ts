import { z } from 'zod/v4-mini'

const envSchema = z.object({
  VITE_SERVER_URL: z._default(z.optional(z.string()), location.origin),
  // Absolute so localhost (which has no /cdn-cgi) still gets resized images; they're served with CORS *
  VITE_IMAGE_CDN: z._default(z.optional(z.string()), 'https://veto.frsty.dev/cdn-cgi/image')
})

export const env = envSchema.parse(import.meta.env)
