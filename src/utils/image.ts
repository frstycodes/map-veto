import { MapData } from '@/config/games/game-config.types'

type ImageSource = { src: string; widths: number[]; aspect?: number; sizes: string }

// valorant-api.com's "tall" art is sometimes the landscape splash (Summit); the crop keeps cards portrait
const PORTRAIT_ASPECT = 765 / 360

export function portraitImageProps(map: MapData): ImageSource {
  return { src: map.selectedImage, widths: [360, 480], aspect: PORTRAIT_ASPECT, sizes: '200px' }
}

export function landscapeImageProps(map: MapData): ImageSource {
  return { src: map.sidePickImage, widths: [360, 480, 640], sizes: '280px' }
}
