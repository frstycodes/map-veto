import { Veto, vetoConstructorSchema } from '@root/src-hono/classes/veto'
import { publicProcedure, router } from '../trpc'
import { vetoMap } from '../globals'
import { z } from 'zod'

export const vetoRouter = router({
  startVeto: publicProcedure.input(vetoConstructorSchema).mutation(({ input }) => {
    const veto = new Veto(input)
    vetoMap.set(veto.id, veto)
    return veto.id
  }),
  getTokens: publicProcedure.input(z.string()).query(({ input }) => {
    const veto = vetoMap.get(input)
    if (!veto) throw new Error('Veto not found')
    return {
      team1: veto.team1.id,
      team2: veto.team2.id,
      viewers: veto.viewersToken
    }
  })
})
