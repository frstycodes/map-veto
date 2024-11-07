import { BanOrder, BanOrderPreset } from '@/types/ban-order.types'
import { createSelector } from 'better-zustand-selector'
import { MapPool } from '@/types/game-config.types'
import { create } from 'zustand'

export type VetoConfigStore = {
  bestOf: number
  pool: MapPool
  banOrders: BanOrder[]
  banOrderPreset: BanOrderPreset
}

const defaultStore: VetoConfigStore = {
  bestOf: 0,
  pool: null!,
  banOrders: [],
  banOrderPreset: BanOrderPreset.LastPick
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
