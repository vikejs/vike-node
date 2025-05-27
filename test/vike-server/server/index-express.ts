import type { Server } from 'node:http'
import { apply, serve } from '@photonjs/core/express'
import express from 'express'
import { getMiddlewares } from 'vike-server/universal-middlewares'
import { init } from '../database/todoItems.js'
import { two } from './shared-chunk.js'

if (two() !== 2) {
  throw new Error()
}

async function startServer() {
  await init()
  const app = express()
  app.use((req, res, next) => {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ;(req as any).xRuntime = 'x-runtime'
    res.set('x-test', 'test')
    next()
  })

  apply(
    app,
    getMiddlewares<'express'>({
      pageContext(runtime) {
        return {
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          xRuntime: (runtime.req as any).xRuntime
        }
      }
    })
  )

  const port = process.env.PORT || 3000

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

export default await startServer()
