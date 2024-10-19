import { LucideIcon } from 'lucide-react'

export type MapPool = {
  id: string
  name: string
  icon: LucideIcon
  maps: string[]
}
export type MapData = {
  id: string
  name: string
  images: string[]
}

export type GameConfig = {
  maps: MapData[]
  pools: Record<string, MapPool>
  defaultPool: string
  bestOfOptions: number[]
  defaultBestOf: number
}
