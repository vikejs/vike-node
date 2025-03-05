import { createServer } from 'node:http'
import { createApp, createRouter, eventHandler, toNodeListener } from 'h3'
import { apply } from 'vike-server/h3'
import { init } from '../database/todoItems'

startServer()

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

  apply(app, {
    pageContext(runtime) {
      return {
        xRuntime: runtime.h3.context.xRuntime
      }
    }
  })

  const server = createServer(toNodeListener(app)).listen(port)

  server.on('listening', () => {
    console.log(`Server running at http://localhost:${port}`)
  })
}
