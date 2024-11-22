export type MapPool = {
  id: string
  name: string
  icon: string
  maps: string[]
}
export type MapData = {
  id: string
  name: string
  images: string[]
}

export type GameConfig = {
  name: string
  maps: MapData[]
  pools: Record<string, MapPool>
  defaultPool: string
  bestOfOptions: number[]
  defaultBestOf: number
  color: string
}
