import { trpcServer } from '@hono/trpc-server'
import { serveStatic } from 'hono/bun'
import { trpcRouter } from './trpc'
import { Hono } from 'hono'

const app = new Hono()

app.use(
  'trpc/*',
  trpcServer({
    router: trpcRouter,
    endpoint: '/trpc'
  })
)

app.use('*', serveStatic({ root: 'dist' }))
app.get('*', serveStatic({ path: 'dist/index.html' }))

export default app
