import { Hono } from 'hono'
import { apply } from 'vike-server/hono'
import { init } from '../database/todoItems'

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

  const { serve } = apply(app, {
    pageContext(runtime) {
      return {
        xRuntime: runtime.hono.get('xRuntime')
      }
    }
  })

  return serve({ port: +port })
}

export default startServer()
