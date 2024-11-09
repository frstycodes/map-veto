import { Stage } from '@/types/ban-order.types'

export type VetoStateReponse = {
  team1: string
  team2: string
  selected: string[] | null
  banned: string[] | null
  currentStage: number
}

export type TeamResponse = {
  name: string
  index: number
}

export type VetoResponse = {
  id: string
  clientType: 'viewer' | 'team1' | 'team2'
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
  const res = await fetch(`http://localhost:8000/api/veto/${id}/state`)
  const data = await res.json()
  return data as VetoStateReponse
}

/**
 *
 * @param id Veto ID
 * @param token Veto Token (Viewer or Team)
 */
export async function getVeto(id: string, token: string) {
  const res = await fetch(`http://localhost:8000/api/veto/${id}?token=${token}`)
  const data = await res.json()
  return data as VetoResponse
}
