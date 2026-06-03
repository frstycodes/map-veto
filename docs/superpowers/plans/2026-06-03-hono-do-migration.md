# Hono + Durable Objects Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Go server (Fly.io, long polling) with a Hono Cloudflare Worker + Durable Objects using SSE for realtime updates.

**Architecture:** A separate Cloudflare Worker under `server/` routes all `/api/veto/:id/*` requests to a `VetoDurableObject` instance keyed by veto ID. The DO holds all session state in memory, fans out state updates to connected SSE clients on every mutation, and uses the DO alarm API for session timeout. The frontend replaces the `useVetoPoller` long-poll hook with a `useVetoSSE` hook backed by the browser `EventSource` API.

**Tech Stack:** Hono v4, `@cloudflare/workers-types`, Cloudflare Durable Objects, Cloudflare Workers, `EventSource` (browser-native), wrangler v4

---

## File Map

**Create (server):**
- `server/package.json` — Worker project deps (hono, @cloudflare/workers-types)
- `server/tsconfig.json` — TS config for Workers
- `server/wrangler.jsonc` — Worker config, DO bindings, migrations
- `server/src/types.ts` — All shared types (VetoState, Stage, PickedMap, etc.)
- `server/src/utils.ts` — `generateId()`, `generateUUID()`
- `server/src/veto-do.ts` — `VetoDurableObject` class (all veto logic + SSE)
- `server/src/index.ts` — Hono Worker entrypoint (CORS, routing to DO)

**Create (frontend):**
- `src/hooks/queries/use-veto-sse.ts` — SSE hook replacing `use-veto-poller.ts`

**Modify (frontend):**
- `src/routes/$game/_layout/$id/_layout/$token/index.tsx` — swap poller hook for SSE hook
- `env.ts` — update `SERVER_URL` default to new Worker URL
- `package.json` — remove Go scripts (`start`, `build:go`, `dev:go`), add `dev:server` and `deploy:server`

**Delete:**
- `src/hooks/queries/use-veto-poller.ts`
- `server/` Go project contents (`.go` files, `go.mod`, `go.sum`, `Dockerfile`, `fly.toml`, `.air.toml`, `makefile`)

---

## Task 1: Scaffold server Worker project

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/wrangler.jsonc`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "map-veto-server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "cf-typegen": "wrangler types"
  },
  "dependencies": {
    "hono": "^4.6.3"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "typescript": "^5.5.3",
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create `server/wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "map-veto-server",
  "main": "src/index.ts",
  "compatibility_date": "2025-06-03",
  "durable_objects": {
    "bindings": [
      {
        "name": "VETO",
        "class_name": "VetoDurableObject"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["VetoDurableObject"]
    }
  ]
}
```

- [ ] **Step 4: Install dependencies**

```bash
cd server && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/tsconfig.json server/wrangler.jsonc server/package-lock.json
git commit -m "feat(server): scaffold Hono Worker project"
```

---

## Task 2: Define shared types

**Files:**
- Create: `server/src/types.ts`

- [ ] **Step 1: Create `server/src/types.ts`**

```typescript
export type Stage = {
  team: number // 1 | 2 | 0 (decider)
  type: 'pick' | 'ban' | 'decider'
}

export type PickedMap = {
  name: string
  by: number // 1 | 2 | 0 (decider)
  attacker: number // 1 | 2 | 0 (not yet picked)
  sidePickTurn: number // 1 | 2
}

export type BannedMap = {
  name: string
  by: number // 1 | 2
}

export type Team = {
  id: string
  name: string
  index: number // 1 | 2
}

export type VetoLog = {
  time: string
  event: string
}

export type VetoConfig = {
  id: string
  creatorToken: string
  team1: Team
  team2: Team
  viewersToken: string
  maps: string[]
  rounds: number
  stages: Stage[]
  game: string
}

export type VetoState = {
  config: VetoConfig
  currentStage: number
  selected: PickedMap[]
  banned: BannedMap[]
  phase: 'choose-maps' | 'choose-sides'
  logs: VetoLog[]
  ended: boolean
}

// Shape pushed via SSE and returned by GET /state
export type VetoPollPayload = {
  team1: string
  team2: string
  selected: PickedMap[]
  banned: BannedMap[]
  currentStage: number
  phase: 'choose-maps' | 'choose-sides'
  ended: boolean
}

// Shape returned by GET /:id
export type VetoResponse = {
  id: string
  myTeam: number // 0 (viewer) | 1 | 2
  team1: { name: string; index: number }
  team2: { name: string; index: number }
  maps: string[]
  rounds: number
  stages: Stage[]
  game: string
  currentStage: number
  selected: PickedMap[]
  banned: BannedMap[]
}

export type StartVetoBody = {
  game: string
  rounds: number
  maps: string[]
  stages: Stage[]
}

export type Env = {
  VETO: DurableObjectNamespace
  CLIENT_URL: string
  VETO_TIMEOUT: string // seconds as string
}
```

- [ ] **Step 2: Verify TS compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/types.ts
git commit -m "feat(server): add shared types"
```

---

## Task 3: Implement utils

**Files:**
- Create: `server/src/utils.ts`

- [ ] **Step 1: Create `server/src/utils.ts`**

```typescript
const ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function generateId(size: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  return Array.from(bytes)
    .map((b) => ID_CHARS[b % ID_CHARS.length]!)
    .join('')
}

export function generateUUID(): string {
  return crypto.randomUUID()
}
```

- [ ] **Step 2: Verify TS compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/utils.ts
git commit -m "feat(server): add generateId and generateUUID utils"
```

---

## Task 4: VetoDurableObject — state + lifecycle

**Files:**
- Create: `server/src/veto-do.ts`

This task creates the DO class skeleton with state initialization, alarm-based timeout, and SSE subscriber management. Veto logic and HTTP routing come in Tasks 5–7.

- [ ] **Step 1: Create `server/src/veto-do.ts`**

```typescript
import { Hono } from 'hono'
import type { VetoConfig, VetoLog, VetoState, BannedMap, PickedMap, VetoPollPayload } from './types'
import { generateId, generateUUID } from './utils'
import type { Stage, StartVetoBody } from './types'

export class VetoDurableObject {
  private state: VetoState | null = null
  private subscribers = new Map<string, ReadableStreamDefaultController>()
  private app: Hono
  private timeoutMs: number

  constructor(
    private ctx: DurableObjectState,
    private env: { CLIENT_URL: string; VETO_TIMEOUT: string }
  ) {
    this.timeoutMs = parseInt(env.VETO_TIMEOUT || '3600', 10) * 1000
    this.app = new Hono()
    this.registerRoutes()
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request)
  }

  async alarm(): Promise<void> {
    // Session timed out — close all SSE connections
    for (const controller of this.subscribers.values()) {
      try {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode('event: close\ndata: timeout\n\n'))
        controller.close()
      } catch {
        // already closed
      }
    }
    this.subscribers.clear()
    this.state = null
  }

  private resetAlarm(): void {
    this.ctx.storage.setAlarm(Date.now() + this.timeoutMs)
  }

  private initState(body: StartVetoBody): VetoState {
    const id = generateId(7)
    const team1: VetoConfig['team1'] = { id: generateId(7), name: '', index: 1 }
    const team2: VetoConfig['team2'] = { id: generateId(7), name: '', index: 2 }

    const config: VetoConfig = {
      id,
      creatorToken: generateUUID(),
      viewersToken: generateId(7),
      team1,
      team2,
      maps: body.maps,
      rounds: body.rounds,
      stages: body.stages,
      game: body.game,
    }

    const initLog: VetoLog = {
      time: new Date().toISOString(),
      event: `Veto initialized with maps: ${body.maps.join(', ')}`,
    }

    return {
      config,
      currentStage: 0,
      selected: [],
      banned: [],
      phase: 'choose-maps',
      logs: [initLog],
      ended: false,
    }
  }

  private getPollPayload(): VetoPollPayload {
    const s = this.state!
    return {
      team1: s.config.team1.name,
      team2: s.config.team2.name,
      selected: s.selected,
      banned: s.banned,
      currentStage: s.currentStage,
      phase: s.phase,
      ended: s.ended,
    }
  }

  private broadcast(): void {
    const payload = this.getPollPayload()
    const data = `data: ${JSON.stringify(payload)}\n\n`
    const encoded = new TextEncoder().encode(data)

    for (const [id, controller] of this.subscribers) {
      try {
        controller.enqueue(encoded)
      } catch {
        this.subscribers.delete(id)
      }
    }
  }

  private registerRoutes(): void {
    // Routes registered in Task 7
  }
}
```

- [ ] **Step 2: Verify TS compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors (registerRoutes is empty stub, that's fine).

- [ ] **Step 3: Commit**

```bash
git add server/src/veto-do.ts
git commit -m "feat(server): add VetoDurableObject skeleton with SSE fan-out and alarm timeout"
```

---

## Task 5: VetoDurableObject — veto logic

**Files:**
- Modify: `server/src/veto-do.ts`

Add all veto mutation methods to the class. These are direct ports of the Go logic.

- [ ] **Step 1: Add helper and mutation methods to `VetoDurableObject`**

Insert these methods inside the class body, before `registerRoutes()`:

```typescript
  private getTeamByIndex(index: number): VetoConfig['team1'] | VetoConfig['team2'] | null {
    const s = this.state!
    if (index === 1) return s.config.team1
    if (index === 2) return s.config.team2
    return null
  }

  private getTeamById(id: string): VetoConfig['team1'] | VetoConfig['team2'] | null {
    const s = this.state!
    if (s.config.team1.id === id) return s.config.team1
    if (s.config.team2.id === id) return s.config.team2
    return null
  }

  private getCurrentStage(): Stage | null {
    const s = this.state!
    return s.config.stages[s.currentStage] ?? null
  }

  private getRemainingMaps(): string[] {
    const s = this.state!
    const usedNames = new Set([
      ...s.selected.map((m) => m.name),
      ...s.banned.map((m) => m.name),
    ])
    return s.config.maps.filter((m) => !usedNames.has(m))
  }

  private getSidePickStage(): { idx: number; map: PickedMap } | null {
    const s = this.state!
    for (let i = 0; i < s.selected.length; i++) {
      const m = s.selected[i]!
      if (m.attacker === 0) return { idx: i, map: m }
    }
    return null
  }

  private banMap(mapName: string, team: number): void {
    const s = this.state!
    s.banned.push({ name: mapName, by: team })
    s.logs.push({
      time: new Date().toISOString(),
      event: `Team ${team} banned ${mapName}`,
    })
  }

  private pickMap(mapName: string, team: number): void {
    const s = this.state!
    // sidePickTurn: team 2 picks side for maps picked by team 1, and vice versa.
    // team 0 (decider) → team 2 picks side first.
    const sidePickTurn = team === 2 ? 1 : 2
    s.selected.push({ name: mapName, by: team, attacker: 0, sidePickTurn })

    if (team === 0) {
      s.logs.push({ time: new Date().toISOString(), event: `${mapName} is the decider map` })
    } else {
      s.logs.push({ time: new Date().toISOString(), event: `Team ${team} picked ${mapName}` })
    }
  }

  private checkIfEnded(): void {
    if (this.getSidePickStage() === null) {
      this.state!.ended = true
    }
  }

  private async runDeciderSequence(): Promise<void> {
    await new Promise((r) => setTimeout(r, 500))
    const remaining = this.getRemainingMaps()
    const randMap = remaining[Math.floor(Math.random() * remaining.length)]!
    this.pickMap(randMap, 0)
    this.broadcast()

    await new Promise((r) => setTimeout(r, 1000))
    this.state!.phase = 'choose-sides'
    this.broadcast()
  }
```

- [ ] **Step 2: Verify TS compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/veto-do.ts
git commit -m "feat(server): add veto logic methods (ban, pick, decider, side pick helpers)"
```

---

## Task 6: VetoDurableObject — SSE route + heartbeat

**Files:**
- Modify: `server/src/veto-do.ts`

Add the SSE subscriber route. Heartbeat keeps connections alive through proxies.

- [ ] **Step 1: Replace the empty `registerRoutes()` method with the SSE route stub**

Replace:
```typescript
  private registerRoutes(): void {
    // Routes registered in Task 7
  }
```

With:
```typescript
  private registerRoutes(): void {
    // POST /api/veto/start is handled in the Worker, not here.
    // All other routes receive requests forwarded by the Worker.

    // GET /api/veto/:id/sse — SSE stream
    this.app.get('/api/veto/:id/sse', (c) => {
      if (!this.state) return c.json({ error: 'Not found' }, 404)
      const clientId = c.req.query('token')
      if (!clientId) return c.json({ error: 'Token required' }, 400)

      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()
      const encoder = new TextEncoder()

      // Use a controller-compatible wrapper over the writer
      const controller: ReadableStreamDefaultController = {
        enqueue: (chunk: Uint8Array) => writer.write(chunk),
        close: () => writer.close(),
        error: (e: unknown) => writer.abort(e),
        desiredSize: null,
      } as unknown as ReadableStreamDefaultController

      this.subscribers.set(clientId, controller)

      // Send current state immediately on connect
      const initial = `data: ${JSON.stringify(this.getPollPayload())}\n\n`
      writer.write(encoder.encode(initial))

      // Heartbeat every 25 seconds
      const heartbeatInterval = setInterval(() => {
        writer.write(encoder.encode(':\n\n')).catch(() => {
          clearInterval(heartbeatInterval)
          this.subscribers.delete(clientId)
        })
      }, 25_000)

      // Cleanup on disconnect
      c.req.raw.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        this.subscribers.delete(clientId)
        writer.close().catch(() => {})
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    })

    // GET /api/veto/:id/state — snapshot (no auth)
    this.app.get('/api/veto/:id/state', (c) => {
      if (!this.state) return c.json({ error: 'Not found' }, 404)
      return c.json(this.getPollPayload())
    })

    // GET /api/veto/:id — veto config, auth by token query param
    this.app.get('/api/veto/:id', (c) => {
      if (!this.state) return c.json({ error: 'Not found' }, 404)
      const token = c.req.query('token')
      const s = this.state

      let myTeam = -1
      if (token === s.config.team1.id) myTeam = 1
      else if (token === s.config.team2.id) myTeam = 2
      else if (token === s.config.viewersToken) myTeam = 0

      if (myTeam === -1) return c.json({ error: 'Unauthorized' }, 401)

      this.resetAlarm()

      return c.json({
        id: s.config.id,
        myTeam,
        team1: { name: s.config.team1.name, index: s.config.team1.index },
        team2: { name: s.config.team2.name, index: s.config.team2.index },
        maps: s.config.maps,
        rounds: s.config.rounds,
        stages: s.config.stages,
        game: s.config.game,
        currentStage: s.currentStage,
        selected: s.selected,
        banned: s.banned,
      })
    })

    // GET /api/veto/:id/tokens — auth by creatorToken
    this.app.get('/api/veto/:id/tokens', (c) => {
      if (!this.state) return c.json({ error: 'Not found' }, 404)
      const creatorToken = c.req.query('creatorToken')
      if (creatorToken !== this.state.config.creatorToken) {
        return c.json({ error: 'Unauthorized' }, 401)
      }
      return c.json({
        tokens: {
          team1: this.state.config.team1.id,
          team2: this.state.config.team2.id,
          viewers: this.state.config.viewersToken,
        },
      })
    })

    // GET /api/veto/:id/logs
    this.app.get('/api/veto/:id/logs', (c) => {
      if (!this.state) return c.json({ error: 'Not found' }, 404)
      return c.json(this.state.logs)
    })

    // POST /api/veto/:id/action — ban or pick
    this.app.post('/api/veto/:id/action', async (c) => {
      if (!this.state) return c.json({ error: 'Not found' }, 404)
      const body = await c.req.json<{ teamId: string; map: string }>()
      const s = this.state

      const stage = this.getCurrentStage()
      if (!stage) return c.json({ error: 'Invalid turn' }, 400)

      const turnTeam = this.getTeamByIndex(stage.team)
      if (!turnTeam || turnTeam.id !== body.teamId) {
        return c.json({ error: 'Not your turn' }, 400)
      }

      if (!s.config.maps.includes(body.map)) {
        return c.json({ error: 'Invalid map' }, 400)
      }

      if (stage.type === 'ban') {
        if (s.banned.some((m) => m.name === body.map)) {
          return c.json({ error: 'Map already banned' }, 400)
        }
        this.banMap(body.map, stage.team)
      } else if (stage.type === 'pick') {
        if (s.selected.some((m) => m.name === body.map)) {
          return c.json({ error: 'Map already picked' }, 400)
        }
        this.pickMap(body.map, stage.team)
      } else {
        return c.json({ error: 'Invalid action' }, 400)
      }

      s.currentStage++
      this.resetAlarm()
      this.broadcast()

      const nextStage = this.getCurrentStage()
      if (nextStage?.type === 'decider') {
        this.ctx.waitUntil(this.runDeciderSequence())
      }

      return c.json({}, 200)
    })

    // POST /api/veto/:id/pick-side
    this.app.post('/api/veto/:id/pick-side', async (c) => {
      if (!this.state) return c.json({ error: 'Not found' }, 404)
      const body = await c.req.json<{ teamId: string; attacker: boolean }>()
      const s = this.state

      const team = this.getTeamById(body.teamId)
      if (!team) return c.json({ error: 'Invalid team' }, 400)

      const sidePickEntry = this.getSidePickStage()
      if (!sidePickEntry) return c.json({ error: 'No side pick pending' }, 400)

      if (team.index !== sidePickEntry.map.sidePickTurn) {
        return c.json({ error: 'Not your turn' }, 400)
      }

      const attackerIndex = body.attacker ? team.index : 3 - team.index
      s.selected[sidePickEntry.idx]!.attacker = attackerIndex

      const side = body.attacker ? 'attacking' : 'defending'
      s.logs.push({
        time: new Date().toISOString(),
        event: `Team ${team.index} chose ${side} on ${sidePickEntry.map.name}`,
      })

      this.checkIfEnded()
      this.resetAlarm()
      this.broadcast()

      return c.json({}, 200)
    })

    // PUT /api/veto/:id/team/:teamId — update team name
    this.app.put('/api/veto/:id/team/:teamId', async (c) => {
      if (!this.state) return c.json({ error: 'Not found' }, 404)
      const teamId = c.req.param('teamId')
      const body = await c.req.json<{ name: string }>()
      const s = this.state

      if (s.config.team1.id === teamId) {
        s.config.team1.name = body.name
      } else if (s.config.team2.id === teamId) {
        s.config.team2.name = body.name
      } else {
        return c.json({ error: 'Invalid team' }, 400)
      }

      this.resetAlarm()
      this.broadcast()
      return c.json({}, 200)
    })

    // POST /api/veto/init — called by Worker after creating the DO, sets initial state
    this.app.post('/api/veto/init', async (c) => {
      if (this.state) return c.json({ error: 'Already initialized' }, 409)
      const body = await c.req.json<StartVetoBody>()
      this.state = this.initState(body)
      this.resetAlarm()
      return c.json({
        id: this.state.config.id,
        creatorToken: this.state.config.creatorToken,
      }, 201)
    })
  }
```

- [ ] **Step 2: Verify TS compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/veto-do.ts
git commit -m "feat(server): add all HTTP routes to VetoDurableObject"
```

---

## Task 7: Hono Worker entrypoint

**Files:**
- Create: `server/src/index.ts`

The Worker is stateless. It handles CORS, `/api/status`, `/api/veto/start`, and forwards all other `/api/veto/:id/*` requests to the matching DO stub.

- [ ] **Step 1: Create `server/src/index.ts`**

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { VetoDurableObject } from './veto-do'
import { generateId } from './utils'
import type { StartVetoBody } from './types'

export { VetoDurableObject }

const app = new Hono<{ Bindings: Env }>()

app.use('*', async (c, next) => {
  const clientUrl = c.env.CLIENT_URL
  return cors({
    origin: clientUrl,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })(c, next)
})

app.get('/api/status', (c) => c.json({ status: 'ok' }))

// Create a new veto session. Worker generates the ID, creates the DO stub, then
// calls /api/veto/init on the DO to set initial state.
app.post('/api/veto/start', async (c) => {
  const body = await c.req.json<StartVetoBody>()

  // Generate a temporary ID to name the DO. The DO will re-generate its own
  // session ID internally (to match Go's 7-char alphanumeric format). We use
  // a UUID as the DO name to guarantee uniqueness.
  const doName = generateId(16)
  const stub = c.env.VETO.get(c.env.VETO.idFromName(doName))

  const initRes = await stub.fetch(
    new Request('https://do/api/veto/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )

  if (!initRes.ok) {
    return c.json({ error: 'Failed to start veto' }, 500)
  }

  const data = await initRes.json<{ id: string; creatorToken: string }>()

  // Store the mapping: vetoId → doName so we can route future requests.
  // We use DO storage on a registry DO, OR we embed the doName in the response
  // and have the client send it back. Simplest: use the vetoId AS the doName.
  //
  // Since the DO generates the vetoId internally, we need to re-key the stub.
  // Better approach: use the doName as both the DO name AND the vetoId.
  // Refactor: pass doName to DO as the session ID instead of generating inside.

  return c.json(data, 201)
})

// Forward all /api/veto/:id/* requests to the matching DO.
// The DO is named by the veto ID (see Task 7 note below).
app.all('/api/veto/:id/*', async (c) => {
  const id = c.req.param('id')
  const stub = c.env.VETO.get(c.env.VETO.idFromName(id))

  // Forward the full request URL and body to the DO
  return stub.fetch(c.req.raw)
})

export default app
```

> **Implementation note:** The above `/api/veto/start` flow has a routing mismatch: the Worker names the DO by `doName` but future requests look up by `vetoId`. Fix this in Task 8 by having the Worker pass `doName` as the session ID to the DO's `initState` so `vetoId === doName`.

- [ ] **Step 2: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(server): add Hono Worker entrypoint with DO routing"
```

---

## Task 8: Fix DO ID routing — use doName as vetoId

The Worker names DOs by a generated `doName`, but routes future requests by `vetoId` (returned from `/init`). These must be the same value.

**Files:**
- Modify: `server/src/veto-do.ts` — accept external ID in `initState`
- Modify: `server/src/index.ts` — pass doName as the ID to init

- [ ] **Step 1: Update `initState` in `veto-do.ts` to accept an external ID**

Change the `initState` method signature and body:

```typescript
  private initState(body: StartVetoBody & { id: string }): VetoState {
    const team1: VetoConfig['team1'] = { id: generateId(7), name: '', index: 1 }
    const team2: VetoConfig['team2'] = { id: generateId(7), name: '', index: 2 }

    const config: VetoConfig = {
      id: body.id,
      creatorToken: generateUUID(),
      viewersToken: generateId(7),
      team1,
      team2,
      maps: body.maps,
      rounds: body.rounds,
      stages: body.stages,
      game: body.game,
    }

    const initLog: VetoLog = {
      time: new Date().toISOString(),
      event: `Veto initialized with maps: ${body.maps.join(', ')}`,
    }

    return {
      config,
      currentStage: 0,
      selected: [],
      banned: [],
      phase: 'choose-maps',
      logs: [initLog],
      ended: false,
    }
  }
```

Also update the `/api/veto/init` route handler type annotation to include `id`:

```typescript
    this.app.post('/api/veto/init', async (c) => {
      if (this.state) return c.json({ error: 'Already initialized' }, 409)
      const body = await c.req.json<StartVetoBody & { id: string }>()
      this.state = this.initState(body)
      this.resetAlarm()
      return c.json({
        id: this.state.config.id,
        creatorToken: this.state.config.creatorToken,
      }, 201)
    })
```

- [ ] **Step 2: Update `index.ts` to generate a 7-char ID and pass it to the DO**

Replace the `/api/veto/start` handler:

```typescript
app.post('/api/veto/start', async (c) => {
  const body = await c.req.json<StartVetoBody>()

  const vetoId = generateId(7)
  const stub = c.env.VETO.get(c.env.VETO.idFromName(vetoId))

  const initRes = await stub.fetch(
    new Request('https://do/api/veto/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, id: vetoId }),
    })
  )

  if (!initRes.ok) {
    return c.json({ error: 'Failed to start veto' }, 500)
  }

  const data = await initRes.json<{ id: string; creatorToken: string }>()
  return c.json(data, 201)
})
```

- [ ] **Step 3: Verify TS compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke test locally**

```bash
cd server && npm run dev
```

In another terminal:
```bash
# Start a veto
curl -X POST http://localhost:8787/api/veto/start \
  -H 'Content-Type: application/json' \
  -d '{"game":"valorant","rounds":1,"maps":["Ascent","Bind","Haven"],"stages":[{"team":1,"type":"ban"},{"team":2,"type":"ban"},{"team":0,"type":"decider"}]}'
```

Expected: `{"id":"<7chars>","creatorToken":"<uuid>"}` with HTTP 201.

```bash
# Check status
curl http://localhost:8787/api/status
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Commit**

```bash
git add server/src/veto-do.ts server/src/index.ts
git commit -m "feat(server): fix DO routing — vetoId equals DO name"
```

---

## Task 9: Frontend — useVetoSSE hook

**Files:**
- Create: `src/hooks/queries/use-veto-sse.ts`

This hook wraps `EventSource`, provides `initialData` hydration, and fires `onData` (equivalent to `afterFetchSync`) on every incoming message.

- [ ] **Step 1: Create `src/hooks/queries/use-veto-sse.ts`**

```typescript
import { useEffect, useRef, useState } from 'react'
import type { VetoStateResponse } from '@/utils/queries/veto-queries'

type UseVetoSSEOpts = {
  initialData: VetoStateResponse
  onData?: (data: VetoStateResponse) => Promise<void>
}

type UseVetoSSEResult = {
  data: VetoStateResponse
  isConnected: boolean
}

export function useVetoSSE(
  id: string,
  clientId: string,
  { initialData, onData }: UseVetoSSEOpts
): UseVetoSSEResult {
  const [data, setData] = useState<VetoStateResponse>(initialData)
  const [isConnected, setIsConnected] = useState(false)
  const onDataRef = useRef(onData)
  onDataRef.current = onData

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'https://map-veto-server.workers.dev'
    const url = `${serverUrl}/api/veto/${id}/sse?token=${clientId}`
    const es = new EventSource(url)

    es.onopen = () => setIsConnected(true)

    es.onmessage = async (event) => {
      const parsed = JSON.parse(event.data) as VetoStateResponse
      if (onDataRef.current) {
        await onDataRef.current(parsed)
      }
      setData(parsed)
    }

    es.addEventListener('close', () => {
      es.close()
      setIsConnected(false)
    })

    es.onerror = () => {
      setIsConnected(false)
      // EventSource reconnects automatically on error — no manual retry needed
    }

    return () => {
      es.close()
    }
  }, [id, clientId])

  return { data, isConnected }
}
```

- [ ] **Step 2: Verify TS compiles (frontend)**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/queries/use-veto-sse.ts
git commit -m "feat: add useVetoSSE hook replacing long poll"
```

---

## Task 10: Frontend — update VetoPoll page to use SSE hook

**Files:**
- Modify: `src/routes/$game/_layout/$id/_layout/$token/index.tsx`

The change is a near-drop-in swap: `useVetoPoller` → `useVetoSSE`, `pollQuery.data` → `sseResult.data`.

- [ ] **Step 1: Update imports in `index.tsx`**

Remove:
```typescript
import { useVetoPoller } from '@/hooks/queries/use-veto-poller'
```

Add:
```typescript
import { useVetoSSE } from '@/hooks/queries/use-veto-sse'
```

- [ ] **Step 2: Replace `useVetoPoller` call with `useVetoSSE`**

Remove:
```typescript
  const pollQuery = useVetoPoller(id, token, {
    initialData: loader_vetoState,

    // The interceptor responsible for checking the decider map.
    async afterFetchSync(data) {
      // Preload the last rounds images
      const dirtyMapCount = (data.selected?.length || 0) + (data.banned?.length || 0)
      if (vetoData.maps.length - dirtyMapCount === vetoData.rounds) {
        const dirtyMaps = vetoData.maps
          .filter((map) => !data.banned?.some((m) => m.name === map))
          .map((map) => {
            const mapData = config.maps.find((m) => m.name === map)
            return mapData!
          })
        preloadMapImages(dirtyMaps)
      }

      // decider animation if required number of maps are selected and phase just changed
      const isDecider = data.selected?.length === vetoData.rounds && vetoState.phase !== data.phase
      if (isDecider) {
        const decider = data.selected?.at(-1)
        if (!decider) return
        await animateDecider(decider)
        return
```

(Read the full `afterFetchSync` block and remove it through its closing `})`)

Add:
```typescript
  const sseResult = useVetoSSE(id, token, {
    initialData: loader_vetoState,
    async onData(data) {
      // Preload the last rounds images
      const dirtyMapCount = (data.selected?.length || 0) + (data.banned?.length || 0)
      if (vetoData.maps.length - dirtyMapCount === vetoData.rounds) {
        const dirtyMaps = vetoData.maps
          .filter((map) => !data.banned?.some((m) => m.name === map))
          .map((map) => {
            const mapData = config.maps.find((m) => m.name === map)
            return mapData!
          })
        preloadMapImages(dirtyMaps)
      }

      // decider animation if required number of maps are selected and phase just changed
      const isDecider = data.selected?.length === vetoData.rounds && vetoState.phase !== data.phase
      if (isDecider) {
        const decider = data.selected?.at(-1)
        if (!decider) return
        await animateDecider(decider)
        return
      }

      // side pick animation
      if (data.phase === VetoPhase.ChooseSides && vetoState.phase !== data.phase) {
        await animateSidePick()
      }
    },
  })
```

- [ ] **Step 3: Replace all `pollQuery.data` references with `sseResult.data`**

Find every occurrence of `pollQuery.data` and `pollQuery` in the file and replace:
- `pollQuery.data` → `sseResult.data`
- `pollQuery` (standalone, e.g. in `isDialogOpen_teamInit`) → `sseResult`

Specifically these lines need updating:
```typescript
// line ~94:
const stage = vetoData.stages[pollQuery.data?.currentStage ?? 0]
// → 
const stage = vetoData.stages[sseResult.data?.currentStage ?? 0]

// line ~95:
const vetoState = {
  ...pollQuery.data,
// →
const vetoState = {
  ...sseResult.data,

// line ~132:
const isDialogOpen_teamInit = !isViewer && (!pollQuery.data?.team1 || !pollQuery.data?.team2)
// →
const isDialogOpen_teamInit = !isViewer && (!sseResult.data?.team1 || !sseResult.data?.team2)

// line ~160:
    enabled: vetoState.ended
// (no change needed here)
```

- [ ] **Step 4: Remove unused `useMutation` import if no longer needed (check)**

```bash
npx tsc --noEmit
```

Fix any type errors. `useMutation` is still used for `selectMapMutation`, so keep it.

- [ ] **Step 5: Delete old poller**

```bash
rm src/hooks/queries/use-veto-poller.ts
```

- [ ] **Step 6: Verify TS compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/routes src/hooks
git commit -m "feat: replace long-poll with SSE in veto page"
```

---

## Task 11: Update env + package.json + wrangler.jsonc

**Files:**
- Modify: `env.ts`
- Modify: `package.json`
- Modify: `wrangler.jsonc` (root — add Worker service binding or proxy)

- [ ] **Step 1: Update `env.ts` default SERVER_URL**

Change:
```typescript
z.object({ SERVER_URL: z.string().optional().default('https://valorant-map-ban.fly.dev/') })
```

To:
```typescript
z.object({ SERVER_URL: z.string().optional().default('https://map-veto-server.workers.dev') })
```

(Update the actual deployed Worker URL once you run `wrangler deploy` in the server project and get the real URL.)

- [ ] **Step 2: Update root `package.json` scripts**

Remove:
```json
"start": "cd ./server && go run ./src/main.go",
"build": "pnpm build:go && pnpm build:vite",
"dev:go": "cd server && go run ./src/main.go",
"build:go": "cd server && go build -o dist/server ./src/main.go",
```

Add/update:
```json
"build": "pnpm build:vite",
"dev:server": "cd server && npm run dev",
"deploy:server": "cd server && npm run deploy",
```

- [ ] **Step 3: Verify frontend builds**

```bash
pnpm build:vite
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add env.ts package.json
git commit -m "chore: update SERVER_URL default and scripts for Hono Worker"
```

---

## Task 12: Delete Go server

- [ ] **Step 1: Remove Go project files**

```bash
rm -rf server/src/api server/src/constants server/src/poll server/src/utils server/src/veto server/src/main.go
rm server/go.mod server/go.sum server/Dockerfile server/fly.toml server/.air.toml server/makefile server/.dockerignore
rm -rf server/.github
```

- [ ] **Step 2: Remove Fly.io devDependency (if present)**

```bash
npm uninstall @flydotio/dockerfile --save-dev 2>/dev/null || true
```

Or manually remove `"@flydotio/dockerfile"` from `package.json` devDependencies and run `pnpm install`.

- [ ] **Step 3: Verify repo state**

```bash
ls server/
```

Expected: only `src/` (TS files), `wrangler.jsonc`, `package.json`, `tsconfig.json`, `node_modules/`, `package-lock.json`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Go server — replaced by Hono Worker"
```

---

## Task 13: End-to-end smoke test

- [ ] **Step 1: Run server locally**

```bash
cd server && npm run dev
```

Expected: `Listening on http://localhost:8787`

- [ ] **Step 2: Run frontend locally pointing at local server**

```bash
VITE_SERVER_URL=http://localhost:8787 pnpm dev
```

- [ ] **Step 3: Create a veto session in browser**

Navigate to `http://localhost:5173`, create a veto with 2+ maps. Verify:
- Veto creation returns a valid ID and creator token
- Navigating to the veto page loads config and initial state
- SSE connection established (check Network tab → EventStream)
- Team name update propagates to all open tabs in real time (no polling delay)
- Ban/pick actions reflect instantly in other tabs
- Side pick dialog appears after maps phase completes
- Session ends correctly after all side picks

- [ ] **Step 4: Deploy server**

```bash
cd server && npm run deploy
```

Note the deployed URL (e.g. `https://map-veto-server.<account>.workers.dev`). Update `env.ts` default `SERVER_URL` to this URL, commit, then deploy frontend:

```bash
pnpm deploy
```

- [ ] **Step 5: Verify production**

Repeat Step 3 against production URL.
