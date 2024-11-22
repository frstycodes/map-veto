export enum BanOrderPreset {
  Alternate = 'alternate',
  LastPick = 'last-pick',
  Custom = 'custom'
}

export enum StageAction {
  Ban = 'ban',
  Pick = 'pick',
  Decider = 'decider'
}

export type Stage =
  | { team: 1 | 2; type: StageAction.Ban | StageAction.Pick }
  | { team: 0; type: StageAction.Decider | null }

export type Preset = {
  icons: React.ReactNode
  label: string
  description: string
  stages: Stage[] | null
}

export type Presets = Record<BanOrderPreset.Alternate | BanOrderPreset.LastPick, Preset>
