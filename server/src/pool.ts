import type { RemoteMap, StoredPool } from './types'
import { Hono } from 'hono'
import z from 'zod/v4'

const KEY = 'valorant'
const VALORANT_API_MAPS = 'https://valorant-api.com/v1/maps'
// valorant-api.com has no rotation data; HenrikDev relays Riot's live queue config per region.
const HENRIK_QUEUE_STATUS = 'https://api.henrikdev.xyz/valorant/v1/queue-status/eu'

const pool = new Hono<{ Bindings: Env }>()

pool.get('/', async (c) => c.json(await c.env.POOLS.get<StoredPool>(KEY, 'json')))

pool.use('/admin/*', async (c, next) => {
  const password = c.req.header('Authorization')?.replace(/^Bearer /, '') ?? ''
  if (!c.env.ADMIN_PASSWORD || !(await safeEqual(password, c.env.ADMIN_PASSWORD)))
    return c.json({ error: 'Unauthorized' }, 401)
  await next()
})

pool.post('/admin/refresh', async (c) => c.json(await refreshPool(c.env)))

pool.put('/admin/comp', async (c) => {
  const body = z.object({ comp: z.array(z.string()).min(3) }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Pick at least 3 maps' }, 400)

  const stored = await c.env.POOLS.get<StoredPool>(KEY, 'json')
  if (!stored) return c.json({ error: 'Refresh the map list first' }, 409)

  const names = new Set(stored.maps.map((m) => m.name))
  if (!body.data.comp.every((n) => names.has(n))) return c.json({ error: 'Unknown map' }, 400)

  const next = { ...stored, comp: body.data.comp } satisfies StoredPool
  await c.env.POOLS.put(KEY, JSON.stringify(next))
  return c.json(next)
})

export { pool }

// Runs from the admin button and the cron trigger. A live rotation overwrites a hand-picked comp pool.
export async function refreshPool(env: Env): Promise<StoredPool> {
  const [maps, rotation, stored] = await Promise.all([
    fetchStandardMaps(),
    fetchCompRotation(env.HENRIK_API_KEY),
    env.POOLS.get<StoredPool>(KEY, 'json')
  ])
  const names = new Set(maps.map((m) => m.name))
  const comp = (rotation ?? stored?.comp ?? []).filter((n) => names.has(n))
  const next = { maps, comp } satisfies StoredPool
  await env.POOLS.put(KEY, JSON.stringify(next))
  return next
}

type ApiMap = {
  displayName: string
  tacticalDescription: string | null
  premierBackgroundImage: string | null
  listViewIconTall: string | null
  splash: string
}

// Only plant/defuse maps carry a tacticalDescription ("A/B Sites"); TDM, skirmish and the range don't.
async function fetchStandardMaps(): Promise<RemoteMap[]> {
  const res = await fetch(VALORANT_API_MAPS)
  if (!res.ok) throw new Error(`valorant-api.com responded ${res.status}`)
  const { data } = (await res.json()) as { data: ApiMap[] }
  return data
    .filter((m) => m.tacticalDescription)
    .map((m) => ({
      name: m.displayName,
      poolImage: m.premierBackgroundImage ?? m.splash,
      selectedImage: m.listViewIconTall ?? m.splash,
      sidePickImage: m.splash
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

type QueueStatus = {
  data: { mode_id: string; maps: { enabled: boolean; map: { name: string } }[] }[]
}

// null keeps the stored comp pool: no key configured, or HenrikDev is down.
async function fetchCompRotation(apiKey: string | undefined): Promise<string[] | null> {
  if (!apiKey) return null
  const res = await fetch(HENRIK_QUEUE_STATUS, { headers: { Authorization: apiKey } })
  if (!res.ok) return null
  const { data } = (await res.json()) as QueueStatus
  const competitive = data.find((q) => q.mode_id === 'competitive')
  const enabled = competitive?.maps.filter((m) => m.enabled).map((m) => m.map.name) ?? []
  return enabled.length >= 3 ? enabled : null
}

// Hashing first gives timingSafeEqual the equal-length inputs it requires.
async function safeEqual(a: string, b: string) {
  const hash = (s: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  const [ha, hb] = await Promise.all([hash(a), hash(b)])
  return crypto.subtle.timingSafeEqual(ha, hb)
}
