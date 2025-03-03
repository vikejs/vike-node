Error.stackTraceLimit = Number.POSITIVE_INFINITY
import { Worker } from 'node:worker_threads'
import fastify, { type FastifyInstance } from 'fastify'
import rawBody from 'fastify-raw-body'
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

  // /!\ Mandatory for vike middleware to operate as intended
  await app.register(rawBody)

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
