import whooshSrc from '@/assets/sfx/veto/whoosh.mp3'
import revealSrc from '@/assets/sfx/veto/reveal.mp3'
import defendSrc from '@/assets/sfx/veto/defend.mp3'
import attackSrc from '@/assets/sfx/veto/attack.mp3'
import pickSrc from '@/assets/sfx/veto/pick.mp3'
import banSrc from '@/assets/sfx/veto/ban.mp3'
import { AppStore } from '@/state/app-store'
import { Howl, Howler } from 'howler'

// Keeps every Howl (these plus the older hover/error sounds) on the one switch
Howler.mute(!AppStore.get().soundEnabled)
AppStore.subscribe((state) => Howler.mute(!state.soundEnabled))

// ban is a CC0 sample from Kenney (kenney.nl, see assets/sfx/veto/LICENSE-kenney.txt); the rest are
// synthesized in-house
const howls = {
  ban: new Howl({ src: [banSrc], volume: 0.4 }),
  pick: new Howl({ src: [pickSrc], volume: 0.27 }),
  reveal: new Howl({ src: [revealSrc], volume: 0.3 }),
  whoosh: new Howl({ src: [whooshSrc], volume: 0.45 }),
  attack: new Howl({ src: [attackSrc], volume: 0.3 }),
  defend: new Howl({ src: [defendSrc], volume: 0.27 })
}

export const sfx = {
  ban: () => howls.ban.play(),
  /** `slot` is the 0-based series map the pick fills; each climbs a step toward the decider */
  pick: (slot = 0) => {
    const id = howls.pick.play()
    howls.pick.rate(2 ** (PICK_STEPS[Math.min(slot, PICK_STEPS.length - 1)] / 12), id)
  },
  reveal: () => howls.reveal.play(),
  whoosh: () => howls.whoosh.play(),
  attack: () => howls.attack.play(),
  defend: () => howls.defend.play()
}

// Semitones up a major scale, so a Bo5's four picks still climb musically
const PICK_STEPS = [0, 2, 4, 7]
