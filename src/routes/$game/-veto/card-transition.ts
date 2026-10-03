import { create } from 'zustand'

// Timeline of the pool card → slab/series card flight. Production runs the defaults; the dev
// playground's panel edits this store live for tuning.
export type CardTransition = {
  isEnabled: boolean
  /** Time for the tall pool card to visually arrive in its slab or series slot, seconds */
  duration: number
  bounce: number
  /** Portrait art cross-fading into the landscape art during the flight, seconds */
  crossfade: number
  /** After landing, the label's dot travelling from the slab's center to its side, seconds */
  labelMove: number
  /** The dot unwrapping back into the label before the ban strike, seconds */
  labelUnwrap: number
}

export const DEFAULT_CARD_TRANSITION: CardTransition = {
  isEnabled: true,
  duration: 0.3,
  bounce: 0.2,
  crossfade: 0.45,
  labelMove: 0.3,
  labelUnwrap: 0.35
}

export const useCardTransitionStore = create<
  CardTransition & { update: (patch: Partial<CardTransition>) => void; reset: () => void }
>((set) => ({
  ...DEFAULT_CARD_TRANSITION,
  update: (patch) => set(patch),
  reset: () => set(DEFAULT_CARD_TRANSITION)
}))

/** Timeline for a landing card; disabled means it snaps into place and everything lands at once */
export function useCardTransition() {
  const { isEnabled, duration, bounce, crossfade, labelMove, labelUnwrap } =
    useCardTransitionStore()
  if (!isEnabled)
    return {
      flight: { duration: 0 },
      crossfade: 0,
      landingDelay: 0,
      labelMove: 0,
      labelUnwrap: 0,
      strikeDelay: 0
    }
  return {
    // visualDuration is when the spring visually arrives (its tail settles after), so landing
    // effects can key off the same number
    flight: { type: 'spring' as const, visualDuration: duration, bounce },
    crossfade,
    landingDelay: duration,
    labelMove,
    labelUnwrap,
    strikeDelay: duration + labelMove + labelUnwrap
  }
}
