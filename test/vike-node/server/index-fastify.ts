Error.stackTraceLimit = Number.POSITIVE_INFINITY
import { Worker } from 'node:worker_threads'
import fastify, { type FastifyInstance } from 'fastify'
import { telefunc } from 'telefunc'
import vike, { type RuntimeAdapter } from 'vike-server/fastify'
import { init } from '../database/todoItems.js'
import { two } from './shared-chunk.js'

if (two() !== 2) {
  throw new Error()
}

startServer()
new Worker(new URL('./worker.mjs', import.meta.url))

async function startServer() {
  await init()
  const app = fastify()
  app.all('/_telefunc', async (req, res) => {
    const context = {}
    const httpResponse = await telefunc({ url: req.originalUrl, method: req.method, body: req.body as string, context })
    const { body, statusCode, contentType } = httpResponse
    res.status(statusCode).type(contentType).send(body)
  })

  app.addHook('onRequest', (request, reply, done) => {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ;(request.routeOptions.config as any).xRuntime = 'x-runtime'
    done()
  })

  app.addHook('onSend', (request, reply, payload, done) => {
    reply.header('x-test', 'test')
    done()
  })

  app.all(
    '/*',
    vike({
      pageContext(runtime: RuntimeAdapter) {
        return {
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          xRuntime: (runtime.fastify.request.routeOptions.config as any).xRuntime
        }
      }
    }) as unknown as Parameters<FastifyInstance['all']>[1]
  )
  const port = process.env.PORT || 3000
  app.listen({ port: +port })
  console.log(`Server running at http://localhost:${port}`)
}
