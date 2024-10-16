import { createSelector } from 'better-zustand-selector'
import mapPools from '@/config/maps/map-pools.json'
import { create } from 'zustand'

export const ROUNDS_OPTIONS = [1, 3, 5] as const

export type VetoCfgStore = {
  bestOf: (typeof ROUNDS_OPTIONS)[number]
  pool: string[]
}

export const vetoCfgStore = create<VetoCfgStore>(() => {
  return {
    bestOf: 1,
    pool: mapPools.allMaps
  }
})

export const VetoCfg = {
  useStore: createSelector(vetoCfgStore),
  set: vetoCfgStore.setState
}
