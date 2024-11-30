import { createJSONStorage, persist } from 'zustand/middleware'
import { createSelector } from 'better-zustand-selector'
import { create } from 'zustand'

export type AppStore = {
  performanceMode: boolean
  onekoEnabled: boolean
}

const appStore = create(
  persist<AppStore>(
    () => ({
      performanceMode: false,
      onekoEnabled: false
    }),
    {
      name: 'config',
      storage: createJSONStorage(() => localStorage)
    }
  )
)

export const AppStore = {
  useStore: createSelector(appStore),
  set: appStore.setState
}
