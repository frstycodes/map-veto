import { BanAction } from '@/types/ban-order.types'
import { z } from 'zod'

export const banOrderSchema = z.union([
  z.object({
    team: z.union([z.literal(1), z.literal(2)]),
    type: z.enum([BanAction.Ban, BanAction.Pick])
  }),
  z.object({
    team: z.literal(null),
    type: z.union([z.literal(BanAction.Decider), z.null()])
  })
])
export type BanOrder = z.infer<typeof banOrderSchema>
