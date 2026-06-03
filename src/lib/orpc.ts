import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { InferRouterInputs, InferRouterOutputs } from '@orpc/server'
import type { router } from '../../server/src/router'

type I = InferRouterInputs<typeof router>
type O = InferRouterOutputs<typeof router>

// Plain callable client type derived entirely from server Zod schemas.
// Inputs and outputs are inferred from @orpc/server — no duplicate type definitions.
export type AppClient = {
  veto: {
    [K in keyof I['veto'] & keyof O['veto']]: (input: I['veto'][K]) => Promise<O['veto'][K]>
  }
}

function getServerUrl() {
  const raw = import.meta.env['VITE_SERVER_URL'] as string | undefined
  return raw ?? 'https://map-veto-server.workers.dev'
}

// createORPCClient<any> bypasses the NestedClient constraint — the runtime proxy
// handles actual calls correctly regardless of the generic parameter.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _client = createORPCClient<any>(new RPCLink({ url: `${getServerUrl()}/rpc` }))
export const orpc = _client as AppClient
