/**
 *
 * @param vetoId
 * @param teamId
 * @param action StageAction (Pick or Ban)
 * @param map Map Name
 */
export async function sendAction(vetoId: string, teamId: string, map: string) {
  const res = await fetch(`http://localhost:8000/api/veto/${vetoId}/action`, {
    method: 'POST',
    body: JSON.stringify({ teamId, map })
  })
  if (!res.ok) {
    throw new Error('Failed to send action')
  }
}
