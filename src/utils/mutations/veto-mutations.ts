import { getVetoSocket } from '@/lib/veto-socket'

export async function sendAction(vetoId: string, teamId: string, map: string) {
  await getVetoSocket(vetoId).send('veto:action', { teamId, map })
}

export async function updateTeam(vetoId: string, teamId: string, name: string) {
  await getVetoSocket(vetoId).send('veto:updateTeam', { teamId, name })
}

export async function pickSide(vetoId: string, teamId: string, attacker: boolean) {
  await getVetoSocket(vetoId).send('veto:pickSide', { teamId, attacker })
}
