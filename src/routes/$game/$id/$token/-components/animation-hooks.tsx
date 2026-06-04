import { PickedMap } from '@/utils/queries/veto-queries'
import { sleep, Time } from '@/utils/time'
import { useState } from 'react'

export enum AnimationState {
  NotStarted,
  Started,
  Ended
}

export function useDeciderAnimation() {
  const [deciderMap, setDeciderMap] = useState<PickedMap | null>(null)
  const [animationState, setAnimationState] = useState(AnimationState.NotStarted)

  const animateDecider = async (decider: PickedMap) => {
    setDeciderMap(decider)
    setAnimationState(AnimationState.Started)

    await sleep(Time.Second * 2)
    // flushSync forces a synchronous render before the caller's setData fires in the same
    // microtask — without this React 18 batches them together, collapsing the exit animation
    setDeciderMap(null)

    // Don't wait for this to finish since we want the map to be added to the selected maps list
    sleep(Time.Second).then(() => setAnimationState(AnimationState.Ended))
  }

  return {
    deciderMap,
    animationState,
    animateDecider
  }
}

export function useSidePickAnimation() {
  const [isSidePickAnimating, setIsSidePickAnimating] = useState(false)

  const animateSidePick = async () => {
    setIsSidePickAnimating(true)
    await sleep(Time.Second * 2)
    setIsSidePickAnimating(false)
  }

  return {
    isSidePickAnimating,
    animateSidePick
  }
}
