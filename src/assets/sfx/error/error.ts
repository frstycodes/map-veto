import error from '@/assets/error/error.wav'
import { Howl } from 'howler'

const soundHowl = new Howl({
  src: [error]
})

export function playErrorSound(volume = 0.5) {
  soundHowl.volume(volume)
  soundHowl.play()
}
