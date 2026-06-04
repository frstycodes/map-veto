import type { AppClient } from '@/lib/orpc'
import { orpc } from '@/lib/orpc'

// ─── Phase / Team enums (used as values in component code, keep as-is) ───────

export const enum VetoPhase {
  ChooseSides = 'choose-sides',
  ChooseMaps = 'choose-maps'
}

export const enum Team {
  Team1 = 1,
  Team2
}

// ─── Types inferred from server router (single source of truth) ──────────────

export type VetoStateResponse = Awaited<ReturnType<AppClient['veto']['state']>>
export type VetoResponse = Awaited<ReturnType<AppClient['veto']['get']>>
export type PickedMap = VetoStateResponse['selected'][number]
export type BannedMap = VetoStateResponse['banned'][number]
export type VetoLog = Awaited<ReturnType<AppClient['veto']['logs']>>[number]
