import { MapData } from '@/config/games/game-config.types'

type ImageSource = { src: string; widths: number[]; aspect?: number; sizes: string }

// valorant-api.com's "tall" art is sometimes the landscape splash (Summit); the crop keeps cards portrait
const PORTRAIT_ASPECT = 765 / 360

// Keep this set fixed and small: every width is its own Cloudflare transformation against the
// monthly quota. 640 covers small landscape uses at 2x, 1280 the 672px side-pick series card.
export function portraitImageProps(map: MapData): ImageSource {
  return { src: map.selectedImage, widths: [480], aspect: PORTRAIT_ASPECT, sizes: '200px' }
}

export function landscapeImageProps(map: MapData, sizes = '280px'): ImageSource {
  return { src: map.sidePickImage, widths: [640, 1280], sizes }
}
