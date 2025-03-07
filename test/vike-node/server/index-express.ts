import { Worker } from 'node:worker_threads'
import express from 'express'
import { telefunc } from 'telefunc'
import vike, { type RuntimeAdapter } from 'vike-node/express'
import { init } from '../database/todoItems.js'
import { two } from './shared-chunk.js'

if (two() !== 2) {
  throw new Error()
}
startServer()
new Worker(new URL('./worker.mjs', import.meta.url))

async function startServer() {
  await init()
  const app = express()
  app.all('/_telefunc', express.text(), async (req, res) => {
    const context = {}
    const httpResponse = await telefunc({ url: req.originalUrl, method: req.method, body: req.body, context })
    const { body, statusCode, contentType } = httpResponse
    res.status(statusCode).type(contentType).send(body)
  })
  app.use((req, res, next) => {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ;(req as any).xRuntime = 'x-runtime'
    res.set('x-test', 'test')
    next()
  })
  app.use(
    vike({
      pageContext(runtime: RuntimeAdapter) {
        return {
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          xRuntime: (runtime.req as any).xRuntime
        }
      }
    })
  )
  const port = process.env.PORT || 3000
  app.listen(port)
  console.log(`Server running at http://localhost:${port}`)
}
