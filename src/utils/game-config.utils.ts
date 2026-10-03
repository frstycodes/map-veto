import { GameConfig } from '@/config/games/game-config.types'
import type { StoredPool } from '@root/server/src/types'
import { games } from '@/config/games'
import { env } from '@root/env'

type GameConfigResult = Promise<Result<Error, GameConfig>>

export async function getGameConfig(game: string): GameConfigResult {
  const isValidGame = games.includes(game)
  if (!isValidGame) return [new Error(`Game ${game} not found`), null]

  const importRes = await import(`@/config/games/${game}.json`)
  const config: GameConfig = importRes.default
  if (game !== 'valorant') return [null, config]
  return [null, withLivePool(config, await fetchLivePool())]
}

export function updatePrimaryColor(color: string) {
  const root = document.documentElement
  if (root) {
    root.style.setProperty('--primary', color)
  }
}

// A failed fetch falls back to the pools bundled in valorant.json rather than blocking the page.
async function fetchLivePool(): Promise<StoredPool | null> {
  const res = await fetch(`${env.VITE_SERVER_URL}/api/pool`).catch(() => null)
  return res?.ok ? res.json() : null
}

function withLivePool(config: GameConfig, live: StoredPool | null): GameConfig {
  if (!live) return config

  const maps = live.maps.map(
    (remote) =>
      config.maps.find((local) => local.name === remote.name) ?? {
        ...remote,
        id: remote.name,
        cardImage: remote.poolImage
      }
  )
  const all = maps.map((m) => m.name)
  const comp = live.comp.length ? live.comp : config.pools.comp.maps.filter((n) => all.includes(n))

  return {
    ...config,
    maps,
    pools: {
      ...config.pools,
      all: { ...config.pools.all, maps: all },
      comp: { ...config.pools.comp, maps: comp }
    }
  }
}
