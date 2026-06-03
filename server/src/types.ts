import type { Stage, PickedMap, BannedMap, VetoLog } from './schemas'

// Re-export schema-derived types so existing imports don't break
export type { Stage, PickedMap, BannedMap, VetoLog }
export type { VetoLogData, VetoPollPayload, VetoResponse, StartVetoBody } from './schemas'

// ─── Internal-only types (no Zod schema needed) ──────────────────────────────

export type Team = {
  id: string
  name: string
  index: 1 | 2
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

export type Env = {
  VETO: DurableObjectNamespace
  CLIENT_URL: string
  VETO_TIMEOUT: string
}
