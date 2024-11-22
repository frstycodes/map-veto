import { BanOrderPreset, Presets } from '@/types/ban-order.types'
import { StageAction, Stage } from '@/types/ban-order.types'
import { Gavel, Swords } from 'lucide-react'

function padBanOrder(stages: Stage[], poolSize: number): Stage[] {
  for (let i = 0; i < poolSize - stages.length; i++) {
    stages.push({ team: 0, type: null })
  }
  return stages
}

/**
 *
 * @param poolSize Size of the map pool
 * @param bestOf Best of X rounds
 * @returns Ban order for the Alternate ban/pick structure
 */
export function getAlternateBanOrder(poolSize: number, bestOf: number): Stage[] | null {
  if (bestOf === 1) return null
  const minRequired = bestOf + 4 // Mininum 4 bans required
  if (poolSize < minRequired) return null

  const stages: Stage[] = []
  let picksUsed = 0

  /*
    {POOLSIZE - 1} won't affect the result when POOLSIZE is odd but when 
    POOLSIZE is even, the last element will be skipped since {Math.floor((POOLSIZE - 1) / 2)}
    will leave 2 maps out of the pool where the last map will be of NO_ACTION type and second 
    last being the DECIDER.
   */
  for (let i = 0; i < Math.floor((poolSize - 1) / 2); i++) {
    const isEven = i % 2 === 0

    const type = (() => {
      const picksLimitReached = picksUsed === bestOf - 1
      if (isEven || picksLimitReached) return StageAction.Ban
      return StageAction.Pick
    })()

    stages.push({ team: 1, type })
    stages.push({ team: 2, type })
    if (type == StageAction.Pick) picksUsed += 2
  }
  stages.push({ team: 0, type: StageAction.Decider })

  padBanOrder(stages, poolSize)

  return stages
}

/**
 *
 * @param poolSize Size of the map pool
 * @param bestOf Best of X rounds
 * @returns Ban order for the last pick structure
 */
export function getLastPickBanOrder(poolSize: number, bestOf: number): Stage[] | null {
  const minRequired = bestOf + 2

  if (poolSize < minRequired) {
    return null
  }

  const stages: Stage[] = []
  let bansRequired = poolSize - bestOf

  /*
    {BANS_REQUIRED - 1} only when POOLSIZE is even as doing that will not break the ban orders and
    balance the bans and picks leaving second last for the DECIDER and the last for NO_ACTION.
   */
  if (poolSize % 2 == 0) {
    bansRequired -= 1
  }

  for (let i = 0; i < bansRequired; i++) {
    stages.push({ team: ((i % 2) + 1) as 1 | 2, type: StageAction.Ban })
  }

  let picksRemaining = bestOf - 1

  while (picksRemaining > 0) {
    stages.push({ team: 1, type: StageAction.Pick })
    stages.push({ team: 2, type: StageAction.Pick })
    picksRemaining -= 2
  }

  stages.push({ team: 0, type: StageAction.Decider })

  return padBanOrder(stages, poolSize)
}

export function validateBanOrder(orders: Stage[], rounds: number): string | null {
  let seenDecider = false
  let seenNull = false
  let deciderCount = 0
  let pickCount = 0
  let team1Bans = 0
  let team2Bans = 0
  let team1Picks = 0
  let team2Picks = 0

  for (let i = 0; i < orders.length; i++) {
    const item = orders[i]
    const itemType = item.type

    if (!itemType) {
      seenNull = true
      continue
    }

    switch (itemType) {
      case StageAction.Decider:
        if (seenNull) {
          return `Decider can't be placed after a null action. Error at position ${i}.`
        }
        if (seenDecider) {
          return `Multiple Deciders are not allowed. Error at position ${i}.`
        }
        seenDecider = true
        deciderCount++
        break

      case StageAction.Pick:
        if (seenDecider || seenNull) {
          return `Pick can't be placed after a Decider or null action. Error at position ${i}.`
        }
        pickCount++
        if (item.team === 1) team1Picks++
        else if (item.team === 2) team2Picks++
        else return `Invalid team for Pick at position ${i}.`
        break

      case StageAction.Ban:
        if (seenDecider || seenNull) {
          return `Ban can't be placed after a Decider or null action. Error at position ${i}.`
        }
        if (item.team === 1) team1Bans++
        else if (item.team === 2) team2Bans++
        else return `Invalid team for Ban at position ${i}.`
        break

      default:
        return `Invalid action type "${itemType}" at position ${i}.`
    }
  }

  if (deciderCount === 0) {
    return 'The order must include exactly one Decider action.'
  }

  if (pickCount + deciderCount !== rounds) {
    return `Invalid pick count.`
  }

  if (team1Bans !== team2Bans) {
    return `Teams must have an equal number of Bans. Team 1 has ${team1Bans}, Team 2 has ${team2Bans}.`
  }

  if (team1Picks !== team2Picks) {
    return `Teams must have an equal number of Picks. Team 1 has ${team1Picks}, Team 2 has ${team2Picks}.`
  }

  return null // Valid order
}

/**
 *
 * @param poolSize Size of the map pool
 * @param bestOf Best of X rounds
 */
export function getAvailableBanOrderPresets(poolSize: number, bestOf: number) {
  const alternate = getAlternateBanOrder(poolSize, bestOf)
  const lastPick = getLastPickBanOrder(poolSize, bestOf)

  const presets: Presets = {
    [BanOrderPreset.Alternate]: {
      icons: (
        <>
          <Gavel />
          <Swords />
          <Gavel />
        </>
      ),
      label: 'Alternate',
      description: 'Ban, Pick, Ban until decider',
      stages: alternate
    },
    [BanOrderPreset.LastPick]: {
      icons: (
        <>
          <Gavel />
          <Gavel />
          <Swords />
        </>
      ),
      label: 'Last Pick',
      description: `Ban until ${bestOf} maps remaining.`,
      stages: lastPick
    }
  }

  return presets
}
