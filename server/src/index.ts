import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env, StartVetoBody } from './types'
import { VetoDurableObject } from './veto-do'
import { generateId } from './utils'

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

// Create a new veto session.
// Worker generates the veto ID (7-char), names the DO by that same ID,
// then calls /api/veto/init on the DO to set initial state.
app.post('/api/veto/start', async (c) => {
  const body = await c.req.json<StartVetoBody>()

  const vetoId = generateId(7)
  const stub = c.env.VETO.get(c.env.VETO.idFromName(vetoId))

  const initRes = await stub.fetch(
    new Request('https://do/api/veto/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, id: vetoId }),
    })
  )

  if (!initRes.ok) {
    return c.json({ error: 'Failed to start veto' }, 500)
  }

  const data = await initRes.json<{ id: string; creatorToken: string }>()
  return c.json(data, 201)
})

// Forward all /api/veto/:id/* requests to the matching DO.
// The DO is named by the veto ID (same as the session ID generated above).
app.all('/api/veto/:id/*', async (c) => {
  const id = c.req.param('id')
  const stub = c.env.VETO.get(c.env.VETO.idFromName(id))
  return stub.fetch(c.req.raw)
})

export default app
