import { trpcServer } from '@hono/trpc-server'
import { trpcRouter } from './routers'
import { serveStatic } from 'hono/bun'
import { logger } from 'hono/logger'
import { Hono } from 'hono'

const app = new Hono()

app.use('*', logger())

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
