import uiSounds from '@/assets/sfx/ui-sounds.wav'
import { Howl } from 'howler'

export enum Sound {
  Error = 'error',
  Success = 'success',
  Neutral = 'neutral',
  Click = 'click',
  Delete = 'delete'
}

const soundHowl = new Howl({
  src: [uiSounds],
  sprite: {
    [Sound.Click]: [0, 1000],
    [Sound.Delete]: [1000, 430],
    [Sound.Error]: [1430, 1000],
    [Sound.Neutral]: [2430, 1593],
    [Sound.Success]: [4023, 1000]
  }
})

export function playUISound(sound: Sound, volume = 0.5) {
  soundHowl.volume(volume)
  soundHowl.play(sound)
}
