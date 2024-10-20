import { initTRPC } from '@trpc/server'

const t = initTRPC.create()

const publicProcedure = t.procedure
const router = t.router
const merge = t.mergeRouters

const statusRouter = router({
  status: publicProcedure.query(() => {
    return 'ok'
  })
})

export const trpcRouter = merge(statusRouter)

export type TRPCRouter = typeof trpcRouter
