import type { RemoteMap } from '@root/server/src/types'

export type MapPool = {
  id: string
  name: string
  icon: string
  maps: string[]
}

export type MapData = RemoteMap

export type GameConfig = {
  slug: string
  name: string
  maps: MapData[]
  pools: Record<string, MapPool>
  defaultPool: string
  bestOfOptions: number[]
  defaultBestOf: number
  color: string
}
