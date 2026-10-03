import type { StoredPool } from '@root/server/src/types'
import { GameConfig } from '@/config/games/game-config.types'
import valorantConfig from '@/config/games/valorant.json'
import { env } from '@root/env'

export async function getGameConfig(): Promise<GameConfig> {
  const res = await fetch(`${env.VITE_SERVER_URL}/api/pool`)
  if (!res.ok) throw new Error(`Couldn't load the map pool (${res.status})`)
  const live: StoredPool = await res.json()

  const { pools } = valorantConfig
  const all = live.maps.map((m) => m.name)
  return {
    ...valorantConfig,
    maps: live.maps,
    pools: {
      all: { ...pools.all, maps: all },
      // Empty until HenrikDev answers or someone saves a pool on /admin
      comp: { ...pools.comp, maps: live.comp.length ? live.comp : all }
    }
  }
}

export function updatePrimaryColor(color: string) {
  const root = document.documentElement
  if (root) {
    root.style.setProperty('--primary', color)
  }
}
