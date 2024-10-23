import { BanOrder } from '@root/types/shared/ban-order.types'
import { banOrderSchema } from '@root/schema/ban-order'
import { validateMaps } from '../utils/maps-utils'
import { generateId } from '../utils/basic-utils'
import { z } from 'zod'

export class Team {
  public id: string
  public teamIndex: 1 | 2
  public name: string

  constructor(teamIndex: 1 | 2 = 1, name?: string) {
    this.id = generateId()
    this.teamIndex = teamIndex
    this.name = name ?? `Team ${teamIndex}`
  }
}

export const vetoConstructorSchema = z
  .object({
    game: z.string(),
    rounds: z.number(),
    maps: z.array(z.string()),
    banOrders: z.array(banOrderSchema)
  })
  .refine(async (data) => {
    const err = await validateMaps(data.maps, data.game)
    if (err) return err
    return true
  }, 'Invalid Ban Order')

type VetoConstructorProps = z.infer<typeof vetoConstructorSchema>

export class Veto {
  public id: string
  public viewersToken: string
  public team1: Team
  public team2: Team
  public banOrders: BanOrder[]
  public maps: string[]
  public rounds: number
  public game: string

  constructor({ game, rounds, maps, banOrders }: VetoConstructorProps) {
    this.id = generateId()
    this.viewersToken = generateId()
    this.team1 = new Team(1)
    this.team2 = new Team(2)
    this.rounds = rounds
    this.game = game
    this.maps = maps
    this.banOrders = banOrders
  }

  start() {
    return {
      team1Token: this.team1.id,
      team2Token: this.team2.id,
      viewersToken: this.viewersToken
    }
  }
}
