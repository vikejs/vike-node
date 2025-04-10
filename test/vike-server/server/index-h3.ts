import type { Server } from 'node:http'
import { apply, serve } from '@photonjs/core/h3'
import { createApp, createRouter, eventHandler } from 'h3'
import { init } from '../database/todoItems'
import { getMiddlewares } from 'vike-server/universal-middlewares'

async function startServer() {
  await init()
  const app = createApp()
  const port = process.env.PORT || 3000

  const router = createRouter()

  app.use(router)

  app.use(
    eventHandler((event) => {
      event.context.xRuntime = 'x-runtime'
      event.node.res.setHeader('x-test', 'test')
    })
  )

  apply(
    app,
    getMiddlewares<'h3'>({
      pageContext(runtime) {
        return {
          xRuntime: runtime.h3.context.xRuntime
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
