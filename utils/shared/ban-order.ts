import { BanAction, BanOrder } from '@root/types/shared/ban-order.types'

function padBanOrder(banOrders: BanOrder[], poolSize: number): BanOrder[] {
  return [
    ...banOrders,
    ...Array(Math.max(0, poolSize - banOrders.length)).fill({
      team: null,
      type: null
    })
  ]
}

/**
 *
 * @param poolSize Size of the map pool
 * @param bestOf Best of X rounds
 * @returns Ban order for the Alternate ban/pick structure
 */
export function getAlternateBanOrder(
  poolSize: number,
  bestOf: number
): BanOrder[] | null {
  if (bestOf === 1) return null
  const minRequired = bestOf + 4 // Mininum 4 bans required
  if (poolSize < minRequired) return null

  const banOrders: BanOrder[] = []
  let picksUsed = 0

  for (let i = 0; i < Math.floor(poolSize / 2); i++) {
    const isEven = !(i & 1)

    const type = (() => {
      const picksLimitReached = picksUsed === bestOf - 1
      if (isEven || picksLimitReached) return BanAction.Ban
      return BanAction.Pick
    })()

    banOrders.push({ team: 1, type })
    banOrders.push({ team: 2, type })
    if (type == BanAction.Pick) picksUsed += 2
  }
  banOrders.push({ team: null, type: BanAction.Decider })

  padBanOrder(banOrders, poolSize)

  return banOrders
}

/**
 *
 * @param poolSize Size of the map pool
 * @param bestOf Best of X rounds
 * @returns Ban order for the last pick structure
 */
export function getLastPickBanOrder(
  poolSize: number,
  bestOf: number
): BanOrder[] | null {
  const minRequired = bestOf + 2
  if (poolSize < minRequired) return null

  const banOrders: BanOrder[] = []
  const bansRequired = poolSize - bestOf

  for (let i = 0; i < bansRequired; i++) {
    banOrders.push({ team: ((i % 2) + 1) as 1 | 2, type: BanAction.Ban })
  }

  let picksRemaining = bestOf - 1

  while (picksRemaining > 0) {
    banOrders.push({ team: 1, type: BanAction.Pick })
    banOrders.push({ team: 2, type: BanAction.Pick })
    picksRemaining -= 2
  }

  banOrders.push({ team: null, type: BanAction.Decider })

  return padBanOrder(banOrders, poolSize)
}

export function validateBanOrder(
  orders: BanOrder[],
  rounds: number
): string | null {
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
      case BanAction.Decider:
        if (seenNull) {
          return `Decider can't be placed after a null action. Error at position ${i}.`
        }
        if (seenDecider) {
          return `Multiple Deciders are not allowed. Error at position ${i}.`
        }
        seenDecider = true
        deciderCount++
        break

      case BanAction.Pick:
        if (seenDecider || seenNull) {
          return `Pick can't be placed after a Decider or null action. Error at position ${i}.`
        }
        pickCount++
        if (item.team === 1) team1Picks++
        else if (item.team === 2) team2Picks++
        else return `Invalid team for Pick at position ${i}.`
        break

      case BanAction.Ban:
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
