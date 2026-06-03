import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { RPCHandler } from '@orpc/server/fetch'
import type { Env } from './types'
import { VetoDurableObject } from './veto-do'
import { router } from './router'

export { VetoDurableObject }

const app = new Hono<{ Bindings: Env }>()

app.use('*', async (c, next) => {
  return cors({
    origin: c.env.CLIENT_URL,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })(c, next)
})

app.get('/api/status', (c) => c.json({ status: 'ok' }))

// oRPC handler — all typed API procedures
const rpcHandler = new RPCHandler(router)

app.all('/rpc/*', async (c) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    context: { env: c.env },
    prefix: '/rpc',
  })
  if (matched) return response
  return c.json({ error: 'Not found' }, 404)
})

// Plain SSE route — not suited to oRPC's request/response model
app.get('/api/veto/:id/sse', async (c) => {
  const id = c.req.param('id')
  const stub = c.env.VETO.get(c.env.VETO.idFromName(id))
  return stub.fetch(c.req.raw)
})

export default app
