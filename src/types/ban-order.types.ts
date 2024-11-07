export enum BanOrderPreset {
  Alternate = 'alternate',
  LastPick = 'last-pick',
  Custom = 'custom'
}

export enum BanAction {
  Ban = 'ban',
  Pick = 'pick',
  Decider = 'decider'
}

export type BanOrder =
  | { team: 1 | 2; type: BanAction.Ban | BanAction.Pick }
  | { team: null; type: BanAction.Decider | null }

export type Preset = {
  icons: React.ReactNode
  label: string
  description: string
  banOrders: BanOrder[] | null
}

export type Presets = Record<
  BanOrderPreset.Alternate | BanOrderPreset.LastPick,
  Preset
>
