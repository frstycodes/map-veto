import { StartVetoBody, Team, VetoConfig, VetoLog, VetoResponse, VetoState } from './types'
import type { PickedMap, Stage, VetoApi, VetoPollPayload } from './types'
import { WebsocketHandler } from 'socket-rpc/core/src'
import { DurableObject } from 'cloudflare:workers'
import { router } from './ws-router'
import { nanoid } from 'nanoid'

type WebSocketMessage = ArrayBuffer | string

const DECIDER_REVEAL_MS = 500
const DEFAULT_TIMEOUT_MINS = 5

export class VetoDurableObject extends DurableObject implements VetoApi {
  private state: VetoState | null = null
  private handler = new WebsocketHandler(router)
  private timeoutMs: number

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // Unset in prod would make setAlarm(NaN) throw, taking the whole session down.
    this.timeoutMs = (parseInt(env.VETO_TIMEOUT_MINS) || DEFAULT_TIMEOUT_MINS) * 60 * 1000
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<VetoState>('state')) ?? null
    })
  }

  // ─── WebSocket transport ───────────────────────────────────────────────────

  async fetch() {
    const [client, server] = Object.values(new WebSocketPair())
    this.ctx.acceptWebSocket(server!)
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, data: WebSocketMessage) {
    await this.conn(ws).handleMessage(data)
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    await this.conn(ws).handleError(error)
  }

  async webSocketClose(ws: WebSocket) {
    await this.conn(ws).handleClose()
  }

  async alarm() {
    for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'timeout')
    await this.ctx.storage.deleteAll()
    this.state = null
  }

  private conn(ws: WebSocket) {
    return this.handler.connection({
      ctx: { veto: this },
      send: (data) => ws.send(data),
      broadcast: (data) => this.broadcast(data)
    })
  }

  private broadcast(data: string) {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(data)
      } catch {
        // socket already gone; hibernation API drops it for us
      }
    }
  }

  /** Push the new state to every connected client after a mutation. */
  private publish() {
    this.broadcast(
      JSON.stringify({ type: 'event', code: 'veto:state', data: this.getPollPayload() })
    )
  }

  // ─── Procedures (called by ws-router) ──────────────────────────────────────

  init(body: StartVetoBody & { id: string }) {
    this.state ??= this.initState(body)
    this.persist()
    return { id: this.state.config.id, creatorToken: this.state.config.creatorToken }
  }

  getVeto(token: string): VetoResponse {
    const s = this.ensureState()
    const myTeam = this.resolveTeam(token)
    if (myTeam === null) throw new Error('UNAUTHORIZED')

    this.resetAlarm()

    return VetoResponse({
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
      banned: s.banned
    })
  }

  getState(): VetoPollPayload {
    this.ensureState()
    return this.getPollPayload()
  }

  getTokens(creatorToken: string) {
    const s = this.ensureState()
    if (creatorToken !== s.config.creatorToken) throw new Error('UNAUTHORIZED')
    return {
      tokens: {
        team1: s.config.team1.id,
        team2: s.config.team2.id,
        viewers: s.config.viewersToken
      }
    }
  }

  banOrPick(teamId: string, map: string) {
    const s = this.ensureState()
    const stage = this.getCurrentStage()
    if (!stage) throw new Error('Invalid turn')

    const turnTeam = this.getTeamByIndex(stage.team)
    if (!turnTeam || turnTeam.id !== teamId) throw new Error('Not your turn')
    if (!this.getRemainingMaps().includes(map)) throw new Error('Invalid map')

    if (stage.type === 'ban') this.banMap(map, stage.team)
    else if (stage.type === 'pick') this.pickMap(map, stage.team)
    else throw new Error('Invalid action')

    s.currentStage++
    this.resetAlarm()
    this.persist()
    this.publish()

    if (this.getCurrentStage()?.type === 'decider') {
      this.ctx.waitUntil(this.runDeciderSequence())
    }
  }

  pickSide(teamId: string, attacker: boolean) {
    const s = this.ensureState()
    const team = this.getTeamById(teamId)
    if (!team) throw new Error('Invalid team')

    const pending = this.getSidePickStage()
    if (!pending) throw new Error('No side pick pending')
    if (team.index !== pending.map.sidePickTurn) throw new Error('Not your turn')

    s.selected[pending.idx]!.attacker = attacker ? team.index : 3 - team.index
    s.logs.push({
      time: new Date().toISOString(),
      data: {
        event: 'side-pick',
        map: pending.map.name,
        side: attacker ? 'attack' : 'defend',
        team: team.index
      }
    })

    s.ended = this.getSidePickStage() === null
    this.resetAlarm()
    this.persist()
    this.publish()
  }

  updateTeam(teamId: string, name: string) {
    const s = this.ensureState()
    const team = this.getTeamById(teamId)
    if (!team) throw new Error('Invalid team')

    team.name = name
    this.resetAlarm()
    this.persist()
    this.publish()
  }

  // ─── Veto rules ────────────────────────────────────────────────────────────

  private initState(body: StartVetoBody & { id: string }): VetoState {
    const config = VetoConfig({
      id: body.id,
      creatorToken: crypto.randomUUID(),
      viewersToken: nanoid(7),
      team1: Team({ id: nanoid(7), name: '', index: 1 }),
      team2: Team({ id: nanoid(7), name: '', index: 2 }),
      maps: body.maps,
      rounds: body.rounds,
      stages: body.stages,
      game: body.game
    })

    const initLog = VetoLog({
      time: new Date().toISOString(),
      data: { event: 'init', maps: body.maps }
    })

    return VetoState({
      config,
      currentStage: 0,
      selected: [],
      banned: [],
      phase: 'choose-maps',
      logs: [initLog],
      ended: false
    })
  }

  private banMap(name: string, team: 0 | 1 | 2) {
    const s = this.ensureState()
    s.banned.push({ name, by: team })
    s.logs.push({
      time: new Date().toISOString(),
      data: { event: 'ban', map: name, by: team as 1 | 2 }
    })
  }

  private pickMap(name: string, team: 0 | 1 | 2) {
    const s = this.ensureState()
    // The opponent picks sides on your map; for the decider (team 0) team 2 picks first.
    s.selected.push({ name, by: team, sidePickTurn: team === 2 ? 1 : 2 })
    s.logs.push({
      time: new Date().toISOString(),
      data:
        team === 0
          ? { event: 'decider', map: name }
          : { event: 'pick', map: name, by: team as 1 | 2 }
    })
  }

  private async runDeciderSequence() {
    await new Promise((r) => setTimeout(r, DECIDER_REVEAL_MS))
    if (!this.state) return

    const remaining = this.getRemainingMaps()
    const decider = remaining[Math.floor(Math.random() * remaining.length)]
    if (!decider) return

    this.pickMap(decider, 0)
    this.state.phase = 'choose-sides'
    this.persist()
    this.publish()
  }

  private getSidePickStage(): { idx: number; map: PickedMap } | null {
    const s = this.ensureState()
    const idx = s.selected.findIndex((m) => m.attacker === undefined)
    if (idx === -1) return null
    return { idx, map: s.selected[idx]! }
  }

  private getRemainingMaps(): string[] {
    const s = this.ensureState()
    const used = new Set([...s.selected.map((m) => m.name), ...s.banned.map((m) => m.name)])
    return s.config.maps.filter((m) => !used.has(m))
  }

  private getCurrentStage(): Stage | null {
    const s = this.ensureState()
    return s.config.stages[s.currentStage] ?? null
  }

  private getTeamByIndex(index: number): Team | null {
    const s = this.ensureState()
    if (index === 1) return s.config.team1
    if (index === 2) return s.config.team2
    return null
  }

  private getTeamById(id: string): Team | null {
    const s = this.ensureState()
    if (s.config.team1.id === id) return s.config.team1
    if (s.config.team2.id === id) return s.config.team2
    return null
  }

  private resolveTeam(token: string): 0 | 1 | 2 | null {
    const s = this.ensureState()
    if (token === s.config.team1.id) return 1
    if (token === s.config.team2.id) return 2
    if (token === s.config.viewersToken) return 0
    return null
  }

  private getPollPayload(): VetoPollPayload {
    const s = this.ensureState()
    return {
      team1: s.config.team1.name,
      team2: s.config.team2.name,
      selected: s.selected,
      banned: s.banned,
      currentStage: s.currentStage,
      phase: s.phase,
      ended: s.ended,
      logs: s.logs
    }
  }

  // ─── State plumbing ────────────────────────────────────────────────────────

  private ensureState(): VetoState {
    if (!this.state) throw new Error('NOT_FOUND')
    return this.state
  }

  private persist() {
    this.ctx.storage.put('state', this.state)
    this.resetAlarm()
  }

  private resetAlarm() {
    this.ctx.storage.setAlarm(Date.now() + this.timeoutMs)
  }
}
