import { orpcClient } from '@/lib/orpc'

export async function sendAction(vetoId: string, teamId: string, map: string) {
  await orpcClient.veto.action({ id: vetoId, teamId, map })
}

export async function updateTeam(vetoId: string, teamId: string, name: string) {
  await orpcClient.veto.updateTeam({ id: vetoId, teamId, name })
}
