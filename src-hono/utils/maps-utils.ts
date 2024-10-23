import { GameConfig } from '@root/types/shared/game-config.types'

export async function validateMaps(maps: string[], game: string) {
  const config: GameConfig = await import(`@root/config/client/maps/${game}.ts`).then((m) => m.default)

  if (!config) return 'Invalid Game'

  if (maps.length < 3) return 'Maps must have at least 3 maps'

  const allMaps = new Set(config.pools.all.maps)
  for (const map of maps) {
    if (!allMaps.has(map)) return `Invalid Pool! Map ${map} is not in the pool`
  }
}
