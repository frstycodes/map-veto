import { Stage, BanOrderPreset } from '@/types/ban-order.types'
import { MapPool } from '@/config/games/game-config.types'
import { createSelector } from 'better-zustand-selector'
import { create } from 'zustand'

export type VetoConfigStore = {
  bestOf: number
  pool: MapPool
  stages: Stage[]
  banOrderPreset: BanOrderPreset
}

const defaultStore: VetoConfigStore = {
  bestOf: 0,
  pool: null!,
  stages: [],
  banOrderPreset: 'lastPick'
}

export const createVetoStore = (initialStore: Partial<VetoConfigStore>) => {
  const initialState = {
    ...defaultStore,
    ...initialStore
  }
  const store = create<VetoConfigStore>(() => initialState)

  return {
    get: store.getState,
    useStore: createSelector(store),
    set: store.setState,
    reset: () => store.setState(defaultStore)
  }
}
