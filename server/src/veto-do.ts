import { Hono } from 'hono'
import type {
  VetoConfig,
  VetoLog,
  VetoState,
  PickedMap,
  VetoPollPayload,
  Stage,
  StartVetoBody,
  Team,
} from './types'
import { generateId, generateUUID } from './utils'

export class VetoDurableObject {
  private state: VetoState | null = null
  private subscribers = new Map<string, ReadableStreamDefaultController>()
  private app: Hono
  private timeoutMs: number

  constructor(
    private ctx: DurableObjectState,
    env: { CLIENT_URL: string; VETO_TIMEOUT: string }
  ) {
    this.timeoutMs = parseInt(env.VETO_TIMEOUT || '3600', 10) * 1000
    this.app = new Hono()
    this.registerRoutes()
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request)
  }

  async alarm(): Promise<void> {
    const encoder = new TextEncoder()
    for (const controller of this.subscribers.values()) {
      try {
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

  private initState(body: StartVetoBody & { id: string }): VetoState {
    const team1: Team = { id: generateId(7), name: '', index: 1 }
    const team2: Team = { id: generateId(7), name: '', index: 2 }

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
      data: { event: 'init', maps: body.maps },
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

  // VETO LOGIC ///////////////////////////////////////////////////////////////

  private getTeamByIndex(index: number): Team | null {
    const s = this.state!
    if (index === 1) return s.config.team1
    if (index === 2) return s.config.team2
    return null
  }

  private getTeamById(id: string): Team | null {
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
      if (m.attacker === undefined) return { idx: i, map: m }
    }
    return null
  }

  private banMap(mapName: string, team: 0 | 1 | 2): void {
    const s = this.state!
    s.banned.push({ name: mapName, by: team })
    s.logs.push({
      time: new Date().toISOString(),
      data: { event: 'ban', map: mapName, by: team as 1 | 2 },
    })
  }

  private pickMap(mapName: string, team: 0 | 1 | 2): void {
    const s = this.state!
    // sidePickTurn: opponent picks sides for your picked map.
    // team 0 (decider) → team 2 picks side first.
    const sidePickTurn = team === 2 ? 1 : 2
    s.selected.push({ name: mapName, by: team, sidePickTurn })

    if (team === 0) {
      s.logs.push({
        time: new Date().toISOString(),
        data: { event: 'decider', map: mapName },
      })
    } else {
      s.logs.push({
        time: new Date().toISOString(),
        data: { event: 'pick', map: mapName, by: team as 1 | 2 },
      })
    }
  }

  private checkIfEnded(): void {
    if (this.getSidePickStage() === null) {
      this.state!.ended = true
    }
  }

  private async runDeciderSequence(): Promise<void> {
    await new Promise((r) => setTimeout(r, 500))
    if (!this.state) return
    const remaining = this.getRemainingMaps()
    const randMap = remaining[Math.floor(Math.random() * remaining.length)]!
    this.pickMap(randMap, 0)
    this.state.phase = 'choose-sides'
    this.broadcast()
  }

  // ROUTES ///////////////////////////////////////////////////////////////////

  private registerRoutes(): void {
    // POST /api/veto/init — called by Worker on session creation
    this.app.post('/api/veto/init', async (c) => {
      if (this.state) return c.json({ error: 'Already initialized' }, 409)
      const body = await c.req.json<StartVetoBody & { id: string }>()
      this.state = this.initState(body)
      this.resetAlarm()
      return c.json(
        { id: this.state.config.id, creatorToken: this.state.config.creatorToken },
        201
      )
    })

    // GET /api/veto/:id/sse — SSE stream
    this.app.get('/api/veto/:id/sse', (c) => {
      if (!this.state) return c.json({ error: 'Not found' }, 404)
      const token = c.req.query('token')
      if (!token) return c.json({ error: 'Token required' }, 400)

      // Use a unique key per connection to prevent collision on client reconnect
      const subscriberId = crypto.randomUUID()

      const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
      const writer = writable.getWriter()
      const encoder = new TextEncoder()

      // Wrap writer as a controller-compatible object
      const controller = {
        enqueue: (chunk: Uint8Array) => { writer.write(chunk).catch(() => {}) },
        close: () => { writer.close().catch(() => {}) },
      } as unknown as ReadableStreamDefaultController

      this.subscribers.set(subscriberId, controller)

      // Send current state immediately on connect
      writer.write(encoder.encode(`data: ${JSON.stringify(this.getPollPayload())}\n\n`))

      // Heartbeat every 25 seconds
      const heartbeat = setInterval(() => {
        writer.write(encoder.encode(':\n\n')).catch(() => {
          clearInterval(heartbeat)
          this.subscribers.delete(subscriberId)
        })
      }, 25_000)

      // Cleanup on client disconnect
      c.req.raw.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        this.subscribers.delete(subscriberId)
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

    // GET /api/veto/:id/state — snapshot
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

      if (!this.getRemainingMaps().includes(body.map)) {
        return c.json({ error: 'Invalid map' }, 400)
      }

      if (stage.type === 'ban') {
        this.banMap(body.map, stage.team)
      } else if (stage.type === 'pick') {
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

      const side: 'attack' | 'defend' = body.attacker ? 'attack' : 'defend'
      s.logs.push({
        time: new Date().toISOString(),
        data: { event: 'side-pick', map: sidePickEntry.map.name, side, team: team.index as 1 | 2 },
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
  }
}
