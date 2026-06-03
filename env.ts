import { z } from 'zod'

function parseViteEnv(env: unknown) {
  return Object.fromEntries(
    Object.entries(env as Record<string, string>).map(([k, v]) => [k.replace('VITE_', ''), v])
  )
}

const envSchema = z.preprocess(
  parseViteEnv,
  z.object({ SERVER_URL: z.string().optional().default('https://valorant-map-ban.fly.dev/') })
)

export const env = envSchema.parse(import.meta.env)
