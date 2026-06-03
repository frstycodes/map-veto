import { os, ORPCError } from '@orpc/server'
import type { Env, VetoResponse, VetoPollPayload, VetoLog } from './types'
import { generateId } from './utils'
import {
  StartVetoInputSchema,
  StartVetoOutputSchema,
  GetVetoInputSchema,
  GetVetoOutputSchema,
  GetVetoStateInputSchema,
  VetoStateOutputSchema,
  GetTokensInputSchema,
  GetTokensOutputSchema,
  ActionInputSchema,
  PickSideInputSchema,
  UpdateTeamInputSchema,
  GetLogsInputSchema,
  GetLogsOutputSchema,
  EmptyOutputSchema,
} from './schemas'

// Base procedure builder with Cloudflare env context
const base = os.$context<{ env: Env }>()

// Helper: get DO stub by veto ID
function getStub(env: Env, vetoId: string) {
  return env.VETO.get(env.VETO.idFromName(vetoId))
}

// Helper: call DO and parse response
async function doFetch(stub: DurableObjectStub, path: string, init?: RequestInit) {
  const res = await stub.fetch(new Request(`https://do${path}`, init))
  return { ok: res.ok, status: res.status, json: () => res.json() }
}

// ─── Procedures ──────────────────────────────────────────────────────────────

export const startVeto = base
  .input(StartVetoInputSchema)
  .output(StartVetoOutputSchema)
  .handler(async ({ input, context }) => {
    const vetoId = generateId(7)
    const stub = getStub(context.env, vetoId)
    const res = await doFetch(stub, '/api/veto/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, id: vetoId }),
    })
    if (!res.ok) throw new ORPCError('INTERNAL_SERVER_ERROR', { message: 'Failed to start veto' })
    return res.json() as Promise<{ id: string; creatorToken: string }>
  })

export const getVeto = base
  .input(GetVetoInputSchema)
  .output(GetVetoOutputSchema)
  .handler(async ({ input, context }) => {
    const stub = getStub(context.env, input.id)
    const res = await doFetch(stub, `/api/veto/${input.id}?token=${input.token}`)
    if (res.status === 404) throw new ORPCError('NOT_FOUND')
    if (res.status === 401) throw new ORPCError('UNAUTHORIZED')
    if (!res.ok) throw new ORPCError('INTERNAL_SERVER_ERROR')
    return res.json() as Promise<VetoResponse>
  })

export const getVetoState = base
  .input(GetVetoStateInputSchema)
  .output(VetoStateOutputSchema)
  .handler(async ({ input, context }) => {
    const stub = getStub(context.env, input.id)
    const res = await doFetch(stub, `/api/veto/${input.id}/state`)
    if (res.status === 404) throw new ORPCError('NOT_FOUND')
    if (!res.ok) throw new ORPCError('INTERNAL_SERVER_ERROR')
    return res.json() as Promise<VetoPollPayload>
  })

export const getTokens = base
  .input(GetTokensInputSchema)
  .output(GetTokensOutputSchema)
  .handler(async ({ input, context }) => {
    const stub = getStub(context.env, input.id)
    const res = await doFetch(stub, `/api/veto/${input.id}/tokens?creatorToken=${input.creatorToken}`)
    if (res.status === 404) throw new ORPCError('NOT_FOUND')
    if (res.status === 401) throw new ORPCError('UNAUTHORIZED')
    if (!res.ok) throw new ORPCError('INTERNAL_SERVER_ERROR')
    return res.json() as Promise<{ tokens: { team1: string; team2: string; viewers: string } }>
  })

export const action = base
  .input(ActionInputSchema)
  .output(EmptyOutputSchema)
  .handler(async ({ input, context }) => {
    const stub = getStub(context.env, input.id)
    const res = await doFetch(stub, `/api/veto/${input.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: input.teamId, map: input.map }),
    })
    if (res.status === 404) throw new ORPCError('NOT_FOUND')
    if (res.status === 400) {
      const data = await res.json() as { error: string }
      throw new ORPCError('BAD_REQUEST', { message: data.error })
    }
    if (!res.ok) throw new ORPCError('INTERNAL_SERVER_ERROR')
    return {}
  })

export const pickSide = base
  .input(PickSideInputSchema)
  .output(EmptyOutputSchema)
  .handler(async ({ input, context }) => {
    const stub = getStub(context.env, input.id)
    const res = await doFetch(stub, `/api/veto/${input.id}/pick-side`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: input.teamId, attacker: input.attacker }),
    })
    if (res.status === 404) throw new ORPCError('NOT_FOUND')
    if (res.status === 400) {
      const data = await res.json() as { error: string }
      throw new ORPCError('BAD_REQUEST', { message: data.error })
    }
    if (!res.ok) throw new ORPCError('INTERNAL_SERVER_ERROR')
    return {}
  })

export const updateTeam = base
  .input(UpdateTeamInputSchema)
  .output(EmptyOutputSchema)
  .handler(async ({ input, context }) => {
    const stub = getStub(context.env, input.id)
    const res = await doFetch(stub, `/api/veto/${input.id}/team/${input.teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: input.name }),
    })
    if (res.status === 404) throw new ORPCError('NOT_FOUND')
    if (!res.ok) throw new ORPCError('INTERNAL_SERVER_ERROR')
    return {}
  })

export const getLogs = base
  .input(GetLogsInputSchema)
  .output(GetLogsOutputSchema)
  .handler(async ({ input, context }) => {
    const stub = getStub(context.env, input.id)
    const res = await doFetch(stub, `/api/veto/${input.id}/logs`)
    if (res.status === 404) throw new ORPCError('NOT_FOUND')
    if (!res.ok) throw new ORPCError('INTERNAL_SERVER_ERROR')
    return res.json() as Promise<VetoLog[]>
  })

// ─── Router ──────────────────────────────────────────────────────────────────

export const router = {
  veto: {
    start: startVeto,
    get: getVeto,
    state: getVetoState,
    tokens: getTokens,
    action,
    pickSide,
    updateTeam,
    logs: getLogs,
  },
}

export type Router = typeof router
