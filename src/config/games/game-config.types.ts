export type MapPool = {
  id: string
  name: string
  icon: string
  maps: string[]
}
export type MapData = {
  id: string
  name: string
  poolImage: string
  cardImage: string
  selectedImage: string
  sidePickImage: string
}

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
