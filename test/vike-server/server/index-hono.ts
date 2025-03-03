import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import vike, { type RuntimeAdapter } from 'vike-server/hono'
import { init } from '../database/todoItems'

startServer()

async function startServer() {
  await init()
  const app = new Hono<{
    Variables: {
      xRuntime: string
    }
  }>()
  const port = process.env.PORT || 3000

  app.use('*', async (ctx, next) => {
    ctx.set('xRuntime', 'x-runtime')
    await next()
    ctx.header('x-test', 'test')
  })

  app.use(
    vike({
      pageContext(runtime: RuntimeAdapter) {
        return {
          xRuntime: runtime.hono.get('xRuntime')
        }
      }
    })
  )

  serve(
    {
      fetch: app.fetch,
      port: +port,
      // Needed for Bun
      overrideGlobalObjects: false
    },
    () => console.log(`Server running at http://localhost:${port}`)
  )
}
