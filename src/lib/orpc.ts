import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { createORPCClient, onError } from '@orpc/client'
import type { router } from '../../server/src/router'
import { RPCLink } from '@orpc/client/fetch'
import { RouterClient } from '@orpc/server'
import { env } from '@root/env'

const URL = env.VITE_SERVER_URL

const link = new RPCLink({
  url: `${URL}/rpc`,
  interceptors: [
    onError((error) => {
      console.error(error)
    })
  ]
})

// Create a client for your router
export const orpcClient: RouterClient<typeof router> = createORPCClient(link)
export type AppClient = typeof orpcClient
export const orpc = createTanstackQueryUtils(orpcClient)
