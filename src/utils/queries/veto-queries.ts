import type { VetoApi } from '../../../server/src/types'

// ─── Phase / Team enums (used as values in component code, keep as-is) ───────

export const enum VetoPhase {
  ChooseSides = 'choose-sides',
  ChooseMaps = 'choose-maps'
}

export const enum Team {
  Team1 = 1,
  Team2
}

// ─── Types inferred from the server contract (single source of truth) ────────

export type VetoStateResponse = ReturnType<VetoApi['getState']>
export type VetoResponse = ReturnType<VetoApi['getVeto']>
export type PickedMap = VetoStateResponse['selected'][number]
export type BannedMap = VetoStateResponse['banned'][number]
export type VetoLog = VetoStateResponse['logs'][number]
