import { Stage } from '@/types/ban-order.types'
import { api } from '../helpers'

export const enum VetoPhase {
  ChooseSides = 'choose-sides',
  ChooseMaps = 'choose-maps'
}

export const enum Team {
  Team1 = 1,
  Team2
}

export type VetoLog = {
  time: string
  event: string
}

export type PickedMap = {
  name: string
  by?: Team | 0 // 0: Decider
  attacker?: Team
  sidePickTurn?: Team
}

export type BannedMap = {
  name: string
  by?: Team
}

export type VetoStateResponse = {
  team1: string
  team2: string
  selected: PickedMap[] | null
  banned: BannedMap[] | null
  currentStage: number
  phase: VetoPhase
  ended: boolean
}

export type TeamResponse = {
  name: string
  index: number
}

export type VetoResponse = {
  id: string
  myTeam: Team | 0 // 0: Viewer
  team1: TeamResponse
  team2: TeamResponse
  maps: string[]
  rounds: number
  stages: Stage[]
  game: string
}

/**
 *
 * @param id Veto ID
 */
export async function getInitialVetoState(id: string) {
  const res = await api(`/api/veto/${id}/state`)
  const data = await res.json()
  return data as VetoStateResponse
}

/**
 *
 * @param id Veto ID
 * @param token Veto Token (Viewer or Team)
 */
export async function getVeto(id: string, token: string) {
  const res = await api(`/api/veto/${id}?token=${token}`)
  const data = await res.json()
  return data as VetoResponse
}

// Utils
