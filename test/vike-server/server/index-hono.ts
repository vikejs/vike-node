import type { Server } from 'node:http'
import { apply, type RuntimeAdapter, serve } from '@photonjs/core/hono'
import { Hono } from 'hono'
import { getMiddlewares } from 'vike-server/universal-middlewares'
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

  apply(
    app,
    getMiddlewares({
      pageContext(runtime: RuntimeAdapter) {
        return {
          xRuntime: runtime.hono.get('xRuntime')
        }
      }
    })
  )

  return serve(app, {
    port: +port,
    onReady() {
      console.log(`Server running at http://localhost:${port}`)
      console.log('HOOK CALLED: onReady')
    },
    onCreate(server?: Server) {
      console.log('HOOK CALLED: onCreate:', server?.constructor.name)
    }
  })
}

export default startServer()
