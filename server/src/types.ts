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
