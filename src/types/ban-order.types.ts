export type BanOrderPreset = 'alternate' | 'lastPick' | 'custom'
export type StageAction = 'ban' | 'pick' | 'decider'

export type Stage = {
  team: 1 | 2 | 0
  type: StageAction | null
}

export type Preset = {
  icons: React.ReactNode
  label: string
  description: string
  stages: Stage[] | null
}

export type Presets = Record<Exclude<BanOrderPreset, 'custom'>, Preset>
