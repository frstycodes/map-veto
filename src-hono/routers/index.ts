import { mergeRouters, publicProcedure, router } from '../trpc'
import { vetoRouter } from './veto-router'

export const statusRouter = router({
  status: publicProcedure.query(() => 'OK')
})

export const trpcRouter = mergeRouters(statusRouter, vetoRouter)
export type TRPCRouter = typeof trpcRouter
