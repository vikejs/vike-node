import { Hono } from 'hono'
import { apply } from 'vike-server/hono'
import { serve } from 'vike-server/hono/serve'
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

  apply(app, {
    pageContext(runtime) {
      return {
        xRuntime: runtime.hono.get('xRuntime')
      }
    }
  })

  // if (process.env.VIKE_HTTPS) {
  //   const { createServer } = await import('node:https')
  //   const { readFileSync } = await import('node:fs')
  //   return serve(app, {
  //     port: +port,
  //     createServer: createServer,
  //     serverOptions: {
  //       key: readFileSync('./localhost.key'),
  //       cert: readFileSync('./localhost.crt')
  //     }
  //   })
  // }

  return serve(app, {
    port: +port
  })
}

export default startServer()
