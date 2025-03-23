import express from 'express'
import { apply } from 'vike-server/express'
import { serve } from 'vike-server/express/serve'
import { init } from '../database/todoItems.js'

async function startServer() {
  await init()
  const app = express()
  app.use((req, res, next) => {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ;(req as any).xRuntime = 'x-runtime'
    res.set('x-test', 'test')
    next()
  })

  apply(app, {
    pageContext(runtime) {
      return {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        xRuntime: (runtime.req as any).xRuntime
      }
    }
  })

  const port = process.env.PORT || 3000

  return serve(app, { port: +port })
}

export default startServer()
