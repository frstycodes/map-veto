import { trpcServer } from '@hono/trpc-server'
import { serveStatic } from 'hono/bun'
import { appRouter } from './trpc'
import { Hono } from 'hono'

const app = new Hono()

app.use(
  'trpc/*',
  trpcServer({
    router: appRouter,
    endpoint: '/trpc'
  })
)

app.use('*', serveStatic({ root: 'dist' }))
app.get('*', serveStatic({ path: 'dist/index.html' }))

export default app
