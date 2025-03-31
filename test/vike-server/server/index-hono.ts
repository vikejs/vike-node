import { Hono } from 'hono'
import { apply } from 'vike-server/hono'
import { serve } from 'vike-server/hono/serve'
import { init } from '../database/todoItems'
import type { Server } from 'node:http'

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

  apply(app, {
    pageContext(runtime) {
      return {
        xRuntime: runtime.hono.get('xRuntime')
      }
    }
  })

  return serve(app, {
    port: +port,
    onServer(server?: Server) {
      console.log('Server:', server?.constructor.name)
    }
  })
}

export default startServer()
