import type { RouterClient } from '@orpc/server'
import type { router } from '../../server/src/router'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

type AppRouter = RouterClient<typeof router>

export type { AppRouter }

function getServerUrl() {
  const raw = import.meta.env['VITE_SERVER_URL'] as string | undefined
  return raw ?? 'https://map-veto-server.workers.dev'
}

const link = new RPCLink({ url: `${getServerUrl()}/rpc` })

export const orpc = createORPCClient<AppRouter>(link)
