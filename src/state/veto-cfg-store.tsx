import { BanOrder, BanOrderPreset } from '@root/types/shared/ban-order.types'
import { MapPool } from '@root/types/shared/game-config.types'
import { createSelector } from 'better-zustand-selector'
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
