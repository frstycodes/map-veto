import {
  canControl,
  DECIDER_REVEAL_MS,
  DECIDER_SETTLE_MS,
  getSideChooser,
  Seat,
  SIDE_HANDOFF_MS,
  TeamIndex,
  Veto,
  VetoAction
} from '../../-veto/veto'
import { pickSide, sendAction } from '@/utils/mutations/veto-mutations'
import { useLoaderData, useParams } from '@tanstack/react-router'
import { useVetoState } from '@/hooks/queries/use-veto-state'
import type { VetoLog } from '@/utils/queries/veto-queries'
import { playErrorSound } from '@/assets/sfx/error/error'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

/** The server veto, shaped for the veto board. Replays the decider reveal and side hand-off the
 *  server resolves instantly, and shows this screen's own action before the server confirms it. */
export function useLiveVeto(): { veto: Veto; isNamingTeams: boolean } {
  const { config } = useLoaderData({ from: '/$game' })
  const { id, token } = useParams({ from: '/$game/$id/$token/' })
  const { vetoState, vetoData } = useLoaderData({ from: '/$game/$id/$token/' })
  const { data } = useVetoState(id, { initialData: vetoState })
  const [optimistic, setOptimistic] = useState<VetoAction[]>([])

  const seat: Seat = vetoData.myTeam === 0 ? 'viewer' : vetoData.myTeam
  const serverActions = data.logs.flatMap(toAction)
  const deciderMap = serverActions.find((a) => a.type === 'decider')?.map
  const reveal = useDeciderReveal(deciderMap)

  const confirmed = reveal.decider
    ? serverActions.filter((a) => a.type !== 'decider')
    : serverActions
  const pending = optimistic.filter((o) => !serverActions.some((a) => a.map === o.map))
  const actions = [...confirmed, ...pending]

  const stages = vetoData.stages.filter((s) => !!s.type)
  const stage = stages[actions.length]
  const isDone = !stage?.type || stage.type === 'decider'
  const played = actions.filter((a) => a.type !== 'ban')

  const attackerOf = (map: string) =>
    data.selected.find((m) => m.name === map)?.attacker as TeamIndex | undefined
  const sidedCount = played.filter((a) => !!attackerOf(a.map)).length
  const isHandingOff = useHandoff(sidedCount)
  const isSidesOpen = data.phase === 'choose-sides' && (!deciderMap || reveal.isSidesOpen)
  const nextSide = played.find((a) => !attackerOf(a.map))
  const pendingSide =
    isSidesOpen && !isHandingOff && nextSide
      ? { map: nextSide.map, chooser: getSideChooser(nextSide.team) }
      : null

  function act(map: string) {
    if (isDone || !stage?.type || !canControl(seat, stage.team)) return
    const action = { map, type: stage.type, team: stage.team, time: new Date().toISOString() }
    setOptimistic((prev) => [...prev, action])
    sendAction(id, token, map).catch(() => {
      setOptimistic((prev) => prev.filter((o) => o !== action))
      reportFailure('Failed to send action')
    })
  }

  function chooseSide(attack: boolean) {
    if (!pendingSide || !canControl(seat, pendingSide.chooser)) return
    pickSide(id, token, attack).catch(() => reportFailure('Failed to choose a side'))
  }

  const veto = {
    seat,
    teams: { 1: data.team1 || 'Team 1', 2: data.team2 || 'Team 2' },
    maps: vetoData.maps.map((name) => {
      const playIdx = played.findIndex((a) => a.map === name)
      return {
        data: config.maps.find((m) => m.name === name)!,
        action: actions.find((a) => a.map === name),
        order: playIdx === -1 ? undefined : playIdx + 1,
        attacker: attackerOf(name)
      }
    }),
    logs: data.logs,
    stages,
    stage,
    actions,
    isDone,
    decider: reveal.decider,
    pendingSide,
    isSidePhase: isSidesOpen && !!nextSide,
    isComplete: isSidesOpen && !nextSide,
    act,
    chooseSide
  } satisfies Veto

  // Teams name themselves on arrival; the board waits until both have
  return { veto, isNamingTeams: seat !== 'viewer' && (!data.team1 || !data.team2) }
}

function toAction({ time, data }: VetoLog): VetoAction[] {
  if (data.event === 'decider') return [{ map: data.map, type: 'decider', team: 0, time }]
  if (data.event === 'ban' || data.event === 'pick')
    return [{ map: data.map, type: data.event, team: data.by, time }]
  return []
}

type RevealStep = 'idle' | 'settling' | 'revealing' | 'placed' | 'open'

// The server draws the decider with the last pick. A decider already drawn when the page loaded
// is shown in place rather than replayed.
function useDeciderReveal(map: string | undefined) {
  const [step, setStep] = useState<RevealStep>(map ? 'open' : 'idle')

  useEffect(() => {
    if (!map || step !== 'idle') return
    setStep('settling')
    const timers = [
      setTimeout(() => setStep('revealing'), DECIDER_SETTLE_MS),
      setTimeout(() => setStep('placed'), DECIDER_SETTLE_MS + DECIDER_REVEAL_MS),
      setTimeout(() => setStep('open'), 2 * DECIDER_SETTLE_MS + DECIDER_REVEAL_MS)
    ]
    return () => timers.forEach(clearTimeout)
    // Runs once per drawn decider; step changes are this effect's own output
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // A freshly drawn decider renders once before the effect starts its reveal; it already counts as
  // settling, or it would land in the series first and then fly to centre stage
  const phase = step === 'idle' ? 'settling' : step
  const isPending = phase === 'settling' || phase === 'revealing'
  return {
    decider: map && isPending ? { map, phase } : null,
    isSidesOpen: step === 'open'
  }
}

// Holds the next side choice back briefly so the one just made settles on its card first
function useHandoff(sidedCount: number) {
  const [isHandingOff, setIsHandingOff] = useState(false)
  const prev = useRef(sidedCount)

  useEffect(() => {
    const grew = sidedCount > prev.current
    prev.current = sidedCount
    if (!grew) return
    setIsHandingOff(true)
    const settled = setTimeout(() => setIsHandingOff(false), SIDE_HANDOFF_MS)
    return () => clearTimeout(settled)
  }, [sidedCount])

  return isHandingOff
}

function reportFailure(message: string) {
  playErrorSound()
  toast.error(message)
}
