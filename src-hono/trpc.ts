import { initTRPC } from '@trpc/server'

const t = initTRPC.create()

const publicProcedure = t.procedure
const router = t.router
const merge = t.mergeRouters

const statusRouter = router({
  status: publicProcedure.query(async function* () {
    let i = 0
    while (1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      yield ++i
    }
  })
})

export const appRouter = merge(statusRouter)

export type TRPCRouter = typeof appRouter
