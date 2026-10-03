import { Stage, StageAction } from '@/types/ban-order.types'
import { MapData } from '@/config/games/game-config.types'
import type { Log } from '@/utils/log-events/logs'

// Lets the last pick finish its flight to the series row before the decider takes the stage
export const DECIDER_SETTLE_MS = 650
export const DECIDER_REVEAL_MS = 2000
// Lets the chosen result settle on its card before the next map becomes active
export const SIDE_HANDOFF_MS = 500

export type TeamIndex = 1 | 2

/** Who this screen plays for; the playground's one screen plays both teams */
export type Seat = TeamIndex | 'viewer' | 'both'

export type VetoAction = {
  map: string
  type: StageAction
  team: Stage['team']
  time: string
}

export type VetoMap = {
  data: MapData
  action: VetoAction | undefined
  /** 1-based play order for picked/decider maps */
  order: number | undefined
  attacker: TeamIndex | undefined
}

export type PendingDecider = { map: string; phase: 'settling' | 'revealing' }
export type PendingSide = { map: string; chooser: TeamIndex }

/** What the veto board renders: the mock veto in the playground, the live server veto in production */
export type Veto = {
  seat: Seat
  teams: Record<TeamIndex, string>
  maps: VetoMap[]
  logs: Log[]
  stages: Stage[]
  stage: Stage | undefined
  actions: VetoAction[]
  isDone: boolean
  decider: PendingDecider | null
  pendingSide: PendingSide | null
  isSidePhase: boolean
  isComplete: boolean
  act: (map: string) => void
  chooseSide: (attack: boolean) => void
}

export function canControl(seat: Seat, team: Stage['team'] | undefined) {
  return seat === 'both' || seat === team
}

// Server rule: the opponent of the picking team chooses sides; Team 2 chooses on the decider
export function getSideChooser(picker: Stage['team']): TeamIndex {
  return picker === 2 ? 1 : 2
}

export function getOpponent(team: TeamIndex): TeamIndex {
  return team === 1 ? 2 : 1
}
