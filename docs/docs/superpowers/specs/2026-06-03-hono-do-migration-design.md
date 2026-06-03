# Hono + Durable Objects Migration Design

**Date:** 2026-06-03  
**Scope:** Replace Go server (Fly.io, long polling) with Hono Worker (Cloudflare) + Durable Objects + SSE

---

## Context

Current stack:
- Go server on Fly.io using `gogf/gf` HTTP framework
- In-memory `VetoMap` — global map of active sessions
- Long polling: client hits `/api/veto/:id/poll` every 1ms, server holds request up to 60s until state changes
- Frontend on Cloudflare Workers (static assets via `wrangler.jsonc`)

Target stack:
- Hono Worker on Cloudflare — separate Worker project under `server/`
- One Durable Object instance per veto session
- Server-Sent Events (SSE) replacing long poll

---

## Architecture

### Worker (`server/src/index.ts`)

Hono app. Handles CORS, routes all `/api/veto/:id/*` to the matching DO stub via `env.VETO.get(env.VETO.idFromName(id))`. The Worker itself is stateless — all veto logic lives in the DO.

CORS: `Access-Control-Allow-Origin` from `CLIENT_URL` env var (same as current Go behavior).

### Durable Object (`server/src/veto-do.ts`)

One instance per veto session, keyed by veto ID string via `idFromName(vetoId)`.

**In-memory state (no DO Storage):**

```ts
interface VetoState {
  config: VetoConfig       // id, creatorToken, team1, team2, viewersToken, maps, rounds, stages, game
  currentStage: number
  selected: PickedMap[]
  banned: BannedMap[]
  phase: 'choose-maps' | 'choose-sides'
  logs: VetoLog[]
  ended: boolean
}
```

**SSE subscribers:**

```ts
subscribers: Map<string, ReadableStreamDefaultController>
```

Keyed by `clientId` (token query param). On every mutation, `broadcast()` serializes current state and writes `data: <json>\n\n` to all controllers. Write errors (closed connections) trigger immediate cleanup from the map.

**Session timeout:**

DO alarm API — `ctx.storage.setAlarm(Date.now() + timeoutMs)`. Any action that mutates state resets the alarm. `alarm()` handler closes all SSE connections (signals clients to stop reconnecting) and clears in-memory state. DO eviction handles memory reclaim.

Timeout value comes from `VETO_TIMEOUT` env var (seconds), same as current Go.

---

## Routes

All routes identical to current Go server. Only `/poll` is replaced by `/sse`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/veto/start` | none | Create session, return `{ id, creatorToken }` |
| `GET` | `/api/veto/:id` | `?token=` | Get veto config + initial state for this token |
| `GET` | `/api/veto/:id/tokens` | `?creatorToken=` | Get team1/team2/viewers tokens |
| `GET` | `/api/veto/:id/state` | none | Current state snapshot (replaces initial poll) |
| `GET` | `/api/veto/:id/sse` | `?token=` | SSE stream — pushes state on every mutation |
| `POST` | `/api/veto/:id/action` | body `{ teamId, map }` | Ban or pick map |
| `POST` | `/api/veto/:id/pick-side` | body `{ teamId, isAttacking }` | Pick attacker/defender |
| `PUT` | `/api/veto/:id/team/:teamId` | body `{ name }` | Update team name |
| `GET` | `/api/veto/:id/logs` | none | Get action logs |
| `GET` | `/api/status` | none | Health check |

---

## SSE Protocol

**Client connects:** `GET /api/veto/:id/sse?token=<clientId>`

**Server response:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Message format** (on every state mutation):
```
data: {"team1":"...","team2":"...","selected":[...],"banned":[...],"currentStage":0,"phase":"choose-maps","ended":false}\n\n
```

**Heartbeat:** `:\n\n` comment every 25 seconds to keep connection alive through proxies.

**Session end:** On timeout, server sends `event: close\ndata: timeout\n\n` then closes the stream. Client should not reconnect on `close` event.

---

## Client Changes

### Replace `use-veto-poller.ts` → `use-veto-sse.ts`

New hook uses `EventSource` instead of `useQuery` polling:

```ts
// src/hooks/queries/use-veto-sse.ts
export function useVetoSSE(id: string, clientId: string, onData: (data: VetoStateResponse) => void)
```

- Creates `EventSource` on mount, tears down on unmount
- On `message`: parses JSON, calls `onData` which does `queryClient.setQueryData(['veto', id], data)`
- On `event: close`: does NOT reconnect — session ended
- On `error`: browser `EventSource` handles reconnect natively (exponential backoff)
- `use-veto-poller.ts` deleted

### `refetchInterval: 1` removal

`useQuery` for veto state no longer polls. Initial state fetched once via `/state` on mount. All subsequent updates come through SSE.

---

## File Structure

```
server/
  src/
    index.ts        # Hono app, CORS, route delegation to DO
    veto-do.ts      # VetoDurableObject — all veto logic, SSE fan-out
    types.ts        # VetoState, VetoConfig, Stage, PickedMap, BannedMap, VetoLog
    utils.ts        # generateId (port of Go GenerateID)
  wrangler.jsonc    # Worker config, DO bindings, migrations
  package.json      # hono, @cloudflare/workers-types
  tsconfig.json
```

Frontend files touched:
- `src/hooks/queries/use-veto-poller.ts` → deleted, replaced by `use-veto-sse.ts`
- `src/routes/$game/_layout/$id/_layout/$token/index.tsx` → swap hook
- `src/utils/queries/veto-queries.ts` → no changes needed

---

## wrangler.jsonc (server)

```jsonc
{
  "name": "map-veto-server",
  "main": "src/index.ts",
  "compatibility_date": "2025-06-03",
  "durable_objects": {
    "bindings": [{ "name": "VETO", "class_name": "VetoDurableObject" }]
  },
  "migrations": [{ "tag": "v1", "new_classes": ["VetoDurableObject"] }],
  "vars": {
    "CLIENT_URL": "https://map-veto.pages.dev"
  }
}
```

`VETO_TIMEOUT` set as a secret via `wrangler secret put VETO_TIMEOUT`.

---

## Logic Parity Checklist

All Go behavior preserved:

- [x] Session ID: 7-char alphanumeric random string
- [x] Creator token: UUID v4
- [x] Viewers token: 7-char alphanumeric
- [x] Team IDs: 7-char alphanumeric
- [x] Stage types: `pick`, `ban`, `decider`
- [x] Decider map: random from remaining maps, 500ms delay, then phase transition after 1s
- [x] Side pick turn logic: team 2 picks first for maps picked by team 1, and vice versa
- [x] `CheckIfEnded`: marks ended when no maps remain with `attacker == 0`
- [x] Timeout reset on every action
- [x] CORS from `CLIENT_URL` env var

---

## What Gets Deleted

- `server/` Go project (all `.go` files, `go.mod`, `go.sum`, `Dockerfile`, `fly.toml`, `.air.toml`, Makefile)
- `package.json` scripts: `start`, `build:go`, `dev:go`
- Fly.io deployment
