import {
  ActionInputSchema,
  GetTokensInputSchema,
  GetVetoInputSchema,
  PickSideInputSchema,
  UpdateTeamInputSchema
} from './schemas'
import type { WebsocketHandler } from 'socket-rpc/core/src'
import { createProcedure } from 'socket-rpc/core/src'
import type { VetoApi } from './types'

// The socket is already bound to one veto's Durable Object, so `id` never
// travels on the wire — the DO instance *is* the address.
const base = createProcedure<{ veto: VetoApi }>()

export const getVeto = base
  .input(GetVetoInputSchema.omit({ id: true }))
  .handler(function* ({ input, veto }) {
    return veto.getVeto(input.token)
  })

export const getState = base.handler(function* ({ veto }) {
  return veto.getState()
})

export const getTokens = base
  .input(GetTokensInputSchema.omit({ id: true }))
  .handler(function* ({ input, veto }) {
    return veto.getTokens(input.creatorToken)
  })

export const action = base
  .input(ActionInputSchema.omit({ id: true }))
  .handler(function* ({ input, veto }) {
    veto.banOrPick(input.teamId, input.map)
    return {}
  })

export const pickSide = base
  .input(PickSideInputSchema.omit({ id: true }))
  .handler(function* ({ input, veto }) {
    veto.pickSide(input.teamId, input.attacker)
    return {}
  })

export const updateTeam = base
  .input(UpdateTeamInputSchema.omit({ id: true }))
  .handler(function* ({ input, veto }) {
    veto.updateTeam(input.teamId, input.name)
    return {}
  })

export const router = {
  'veto:get': getVeto,
  'veto:state': getState,
  'veto:tokens': getTokens,
  'veto:action': action,
  'veto:pickSide': pickSide,
  'veto:updateTeam': updateTeam
}

export type VetoRouter = typeof router

/** The shape the browser client infers its call/event types from. */
export type VetoHandler = WebsocketHandler<VetoRouter, {}, { veto: VetoApi }>

/** Server pushes, keyed by event code. */
export type VetoEvents = {
  'veto:state': ReturnType<VetoApi['getState']>
}
