import {
  createTRPCQueryUtils,
  createTRPCReact,
  httpBatchLink
} from '@trpc/react-query'
import { type TRPCRouter } from '@root/src-hono/trpc'
import { QueryClient } from '@tanstack/react-query'

export const trpc = createTRPCReact<TRPCRouter>()

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/trpc',
      fetch(url, options) {
        return fetch(url, { ...options, credentials: 'include' })
      }
    })
  ]
})

export const queryClient = new QueryClient()

export const trpcUtils = createTRPCQueryUtils({
  client: trpcClient,
  queryClient
})
