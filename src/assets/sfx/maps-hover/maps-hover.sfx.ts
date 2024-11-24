import hover from './maps-hover.mp3'

import { Howl } from 'howler'

const hoverHowl = new Howl({
  src: [hover]
})

export function playMapsHoverSound(volume = 0.5) {
  hoverHowl.volume(volume)
  hoverHowl.play()
}
