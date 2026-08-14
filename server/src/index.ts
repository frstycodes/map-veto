import { StartVetoInputSchema } from './schemas'
import { VetoDurableObject } from './veto-do'
import { cors } from 'hono/cors'
import { nanoid } from 'nanoid'
import { Hono } from 'hono'

const app = new Hono<{ Bindings: Env }>()

app.use('*', (c, next) =>
  cors({
    origin: c.env.CLIENT_URL,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type']
  })(c, next)
)

app.get('/api/status', (c) => c.json({ status: 'ok' }))

// Creating a veto is the one call with no session to attach a socket to yet.
app.post('/api/veto', async (c) => {
  const body = StartVetoInputSchema.safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid body' }, 400)

  const id = nanoid(7)
  const stub = c.env.VETO.get(c.env.VETO.idFromName(id))
  return c.json(await stub.init({ ...body.data, id }))
})

// Everything else runs over the veto's own socket.
app.get('/api/ws/:vetoId', (c) => {
  if (c.req.header('Upgrade') !== 'websocket')
    return c.json({ error: 'Expected a websocket upgrade' }, 426)

  const stub = c.env.VETO.get(c.env.VETO.idFromName(c.req.param('vetoId')))
  return stub.fetch(c.req.raw)
})

export default app
export { VetoDurableObject }
