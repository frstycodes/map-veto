import {
  DECIDER_REVEAL_MS,
  DECIDER_SETTLE_MS,
  getOpponent,
  getSideChooser,
  PendingDecider,
  PendingSide,
  Seat,
  SIDE_HANDOFF_MS,
  TeamIndex,
  Veto,
  VetoAction,
  VetoMap
} from '../-veto/veto'
import { getAlternateBanOrder, getLastPickBanOrder } from '@/utils/ban-order'
import { GameConfig } from '@/config/games/game-config.types'
import type { Log } from '@/utils/log-events/logs'
import { Stage } from '@/types/ban-order.types'
import { useState } from 'react'

export type MockPreset = 'alternate' | 'lastPick'

type SideChoice = { attacker: TeamIndex; chooser: TeamIndex; time: string }

export const MOCK_TEAMS = { 1: 'Team Alpha', 2: 'Team Bravo' } as const

// ponytail: client-only stand-in for the Durable Object veto, mirrors its stage, random-decider and side-pick rules
export function useMockVeto(config: GameConfig, bestOf: number, preset: MockPreset, seat: Seat) {
  const pool = config.pools[config.defaultPool].maps
  const stages = getStages(pool.length, bestOf, preset)
  const [actions, setActions] = useState<VetoAction[]>([])
  const [decider, setDecider] = useState<PendingDecider | null>(null)
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString())
  const [sides, setSides] = useState<Record<string, SideChoice>>({})
  const [isSidesOpen, setIsSidesOpen] = useState(false)
  const [isHandingOff, setIsHandingOff] = useState(false)

  const stage = stages[actions.length] as Stage | undefined
  const isDone = !stage?.type || stage.type === 'decider'
  const played = actions.filter((a) => a.type !== 'ban')

  const nextSide = played.find((a) => !sides[a.map])
  const pendingSide: PendingSide | null =
    isSidesOpen && !isHandingOff && nextSide
      ? { map: nextSide.map, chooser: getSideChooser(nextSide.team) }
      : null
  const isComplete = isSidesOpen && !nextSide

  const maps: VetoMap[] = pool.map((name) => {
    const playIdx = played.findIndex((a) => a.map === name)
    return {
      data: config.maps.find((m) => m.name === name)!,
      action: actions.find((a) => a.map === name),
      order: playIdx === -1 ? undefined : playIdx + 1,
      attacker: sides[name]?.attacker
    }
  })

  function act(map: string) {
    if (isDone || !stage?.type) return
    const next = [...actions, { map, type: stage.type, team: stage.team, time: now() }]
    setActions(next)
    if (stages[next.length]?.type !== 'decider') return

    const pick = pickDecider(pool, next)
    setDecider({ map: pick.map, phase: 'settling' })
    setTimeout(() => setDecider({ map: pick.map, phase: 'revealing' }), DECIDER_SETTLE_MS)
    setTimeout(() => {
      setActions((prev) => [...prev, { ...pick, time: now() }])
      setDecider(null)
    }, DECIDER_SETTLE_MS + DECIDER_REVEAL_MS)
    setTimeout(() => setIsSidesOpen(true), 2 * DECIDER_SETTLE_MS + DECIDER_REVEAL_MS)
  }

  function chooseSide(attack: boolean) {
    if (!pendingSide) return
    const { map, chooser } = pendingSide
    const attacker = attack ? chooser : getOpponent(chooser)
    setSides((prev) => ({ ...prev, [map]: { attacker, chooser, time: now() } }))
    setIsHandingOff(true)
    setTimeout(() => setIsHandingOff(false), SIDE_HANDOFF_MS)
  }

  function undo() {
    if (decider || isHandingOff) return
    const lastSided = [...played].reverse().find((a) => sides[a.map])
    if (lastSided) {
      setSides(({ [lastSided.map]: _, ...rest }) => rest)
      return
    }
    setIsSidesOpen(false)
    setActions((prev) => prev.slice(0, prev.at(-1)?.type === 'decider' ? -2 : -1))
  }

  function reset() {
    if (decider || isHandingOff) return
    setActions([])
    setSides({})
    setStartedAt(now())
    setIsSidesOpen(false)
  }

  // Same shape the server streams, so the real log component renders it unchanged
  const logs: Log[] = [
    { time: startedAt, data: { event: 'init' as const, maps: pool } },
    ...actions.map(toLog),
    ...played.flatMap((a) => {
      const side = sides[a.map]
      if (!side) return []
      return [
        {
          time: side.time,
          data: {
            event: 'side-pick' as const,
            map: a.map,
            team: side.chooser,
            side: side.attacker === side.chooser ? ('attack' as const) : ('defend' as const)
          }
        }
      ]
    })
  ].sort((a, b) => a.time.localeCompare(b.time))

  const veto = {
    seat,
    teams: MOCK_TEAMS,
    maps,
    logs,
    stages: stages.filter((s) => !!s.type),
    stage,
    actions,
    isDone,
    decider,
    pendingSide,
    isSidePhase: isSidesOpen && !!nextSide,
    isComplete,
    act,
    chooseSide
  } satisfies Veto

  return { veto, canUndo: !!actions.length, undo, reset }
}

function getStages(poolSize: number, bestOf: number, preset: MockPreset): Stage[] {
  const alternate = preset === 'alternate' ? getAlternateBanOrder(poolSize, bestOf) : null
  return alternate ?? getLastPickBanOrder(poolSize, bestOf) ?? []
}

function pickDecider(pool: string[], actions: VetoAction[]): VetoAction {
  const remaining = pool.filter((m) => !actions.some((a) => a.map === m))
  const map = remaining[Math.floor(Math.random() * remaining.length)]
  return { map, type: 'decider', team: 0, time: now() }
}

function toLog(action: VetoAction): Log {
  if (action.type === 'decider')
    return { time: action.time, data: { event: 'decider', map: action.map } }
  return {
    time: action.time,
    data: { event: action.type, map: action.map, by: action.team as TeamIndex }
  }
}

function now() {
  return new Date().toISOString()
}
