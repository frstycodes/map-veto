import { MapData } from '@/config/games/game-config.types'

export function getImageNameAndExtFromPath(path: string) {
  const parts = path.split('/')
  const filename = parts[parts.length - 1]
  const [name, ext] = filename.split('.')
  return { name, ext }
}

// srcSet keys are real file widths in /optimized. Valorant has portrait "-tall" art (360/480 only);
// CS2 ships one landscape image per map, so portrait cards need its widest file.
// TODO(images): move per-game widths into the game config once a third game lands.
type ImageSource = { src: string; srcSet: Record<number, number>; sizes: string }

export function portraitImageProps(map: MapData, game: string): ImageSource {
  const src = `/optimized/${map.selectedImage}`
  if (game === 'cs2')
    return { src, srcSet: { 360: 360, 480: 480, 640: 640, 1000: 1000 }, sizes: '430px' }
  return { src, srcSet: { 360: 360, 480: 480 }, sizes: '200px' }
}

export function landscapeImageProps(map: MapData): ImageSource {
  return {
    src: `/optimized/${map.sidePickImage}`,
    srcSet: { 360: 360, 480: 480, 640: 640 },
    sizes: '280px'
  }
}
