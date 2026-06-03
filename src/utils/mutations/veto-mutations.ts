import { orpc } from '@/lib/orpc'

export async function sendAction(vetoId: string, teamId: string, map: string) {
  await orpc.veto.action({ id: vetoId, teamId, map })
}

export async function pickSide(vetoId: string, teamId: string, attacker: boolean) {
  await orpc.veto.pickSide({ id: vetoId, teamId, attacker })
}

export async function updateTeam(vetoId: string, teamId: string, name: string) {
  await orpc.veto.updateTeam({ id: vetoId, teamId, name })
}
