import { Stage } from '@/types/ban-order.types'
import { api } from '../helpers'

export enum VetoPhase {
  ChooseSides = 'choose-sides',
  ChooseMaps = 'choose-maps'
}

export type VetoLog = {
  time: string
  event: string
}

export type PickedMap = {
  name: string
  by?: 0 | 1 | 2
  attacker?: 1 | 2
  sidePickTurn?: 1 | 2
}

export type BannedMap = {
  name: string
  by?: 0 | 1 | 2
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

export enum TeamWithViewer {
  Viewer,
  Team1,
  Team2
}

export type VetoResponse = {
  id: string
  myTeam: TeamWithViewer
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
