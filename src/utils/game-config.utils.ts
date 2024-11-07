import { GameConfig } from '@/types/game-config.types'
import { games } from '@/config/games'

type GameConfigResult = Promise<Result<Error, GameConfig>>

export async function getGameConfig(game: string): GameConfigResult {
  const isValidGame = games.has(game)
  if (!isValidGame) return [new Error(`Game ${game} not found`), null]

  const importRes = await import(`@/config/games/${game}.json`)
  const config: GameConfig = importRes.default
  return [null, config]
}

export function updatePrimaryColor(color: string) {
  const root = document.documentElement
  if (root) {
    root.style.setProperty('--primary', color)
  }
}
