import { StageAction } from '@/types/ban-order.types'
import { z } from 'zod'

export const banOrderSchema = z.union([
  z.object({
    team: z.union([z.literal(1), z.literal(2)]),
    type: z.enum([StageAction.Ban, StageAction.Pick])
  }),
  z.object({
    team: z.literal(null),
    type: z.union([z.literal(StageAction.Decider), z.null()])
  })
])
export type Stage = z.infer<typeof banOrderSchema>
