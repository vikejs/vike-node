import type { Server } from 'node:http'
import { Worker } from 'node:worker_threads'
import fastify from 'fastify'
import rawBody from 'fastify-raw-body'
import { apply } from 'vike-server/fastify'
import { serve } from 'vike-server/fastify/serve'
import { init } from '../database/todoItems.js'
import { two } from './shared-chunk.js'

Error.stackTraceLimit = Number.POSITIVE_INFINITY

if (two() !== 2) {
  throw new Error()
}

new Worker(new URL('./worker.js', import.meta.url))

async function startServer() {
  await init()
  const app = fastify({
    // /!\ Mandatory for server HMR support
    forceCloseConnections: true
  })

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

  await apply(app, {
    pageContext(runtime) {
      return {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        xRuntime: (runtime.fastify.request.routeOptions.config as any).xRuntime
      }
    }
  })

  const port = process.env.PORT || 3000
  return serve(app, {
    port: +port,
    onReady() {
      console.log(`Server running at http://localhost:${port}`)
      console.log('HOOK CALLED: onReady')
    },
    onServer(server?: Server) {
      console.log('HOOK CALLED: onServer:', server?.constructor.name)
    }
  })
}

export default startServer()
