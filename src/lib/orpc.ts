import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { Router } from '../../server/src/router'

// Re-export Router type so components can use it for inference
export type { Router }

function getServerUrl() {
  const raw = import.meta.env['VITE_SERVER_URL'] as string | undefined
  return raw ?? 'https://map-veto-server.workers.dev'
}

const link = new RPCLink({ url: `${getServerUrl()}/rpc` })

export const orpc = createORPCClient<Router>(link)
