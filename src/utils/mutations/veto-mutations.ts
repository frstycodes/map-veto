import { api } from '../helpers'

/**
 *
 * @param vetoId
 * @param teamId
 * @param action StageAction (Pick or Ban)
 * @param map Map Name
 */
export async function sendAction(vetoId: string, teamId: string, map: string) {
  const res = await api(`/api/veto/${vetoId}/action`, {
    method: 'POST',
    body: JSON.stringify({ teamId, map })
  })
  if (!res.ok) {
    throw new Error('Failed to send action')
  }
}

export async function pickSide(vetoId: string, teamId: string, attacker: boolean) {
  const res = await api(`/api/veto/${vetoId}/pick-side`, {
    method: 'POST',
    body: JSON.stringify({ teamId, attacker })
  })
  if (!res.ok) {
    throw new Error('Failed to pick side')
  }
}
