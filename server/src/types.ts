import type {
  Stage,
  PickedMap,
  BannedMap,
  VetoLog,
  VetoResponse,
  VetoPollPayload
} from './schemas'
import { typesafeValueInit } from '../utils/typesafe-value-init'

export {
  Stage,
  PickedMap,
  BannedMap,
  VetoLog,
  VetoPollPayload,
  VetoResponse,
  StartVetoBody
} from './schemas'
export type { VetoLogData } from './schemas'

// ─── Internal-only types (no Zod schema needed) ──────────────────────────────

/**
 * What the socket router is allowed to call on a veto. Declared apart from the
 * Durable Object so the client can infer wire types without pulling in
 * `cloudflare:workers`.
 */
export type VetoApi = {
  getVeto(token: string): VetoResponse
  getState(): VetoPollPayload
  getTokens(creatorToken: string): { tokens: { team1: string; team2: string; viewers: string } }
  banOrPick(teamId: string, map: string): void
  pickSide(teamId: string, attacker: boolean): void
  updateTeam(teamId: string, name: string): void
}

export const Team = typesafeValueInit<Team>()
export type Team = {
  id: string
  name: string
  index: 1 | 2
}

export const VetoConfig = typesafeValueInit<VetoConfig>()
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

export const VetoState = typesafeValueInit<VetoState>()
export type VetoState = {
  config: VetoConfig
  currentStage: number
  selected: PickedMap[]
  banned: BannedMap[]
  phase: 'choose-maps' | 'choose-sides'
  logs: VetoLog[]
  ended: boolean
}

export type RemoteMap = {
  name: string
  poolImage: string
  selectedImage: string
  sidePickImage: string
}
export type StoredPool = { maps: RemoteMap[]; comp: string[] }
