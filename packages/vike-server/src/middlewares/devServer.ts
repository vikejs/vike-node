import type { Get, UniversalMiddleware } from '@universal-middleware/core'
import { handleViteDevServer } from '../runtime/adapters/handleViteDevServer.js'
import type { IncomingMessage } from 'node:http'
import { globalStore } from '../runtime/globalStore.js'
import { connectToWeb } from '@universal-middleware/express'

export const devServerMiddleware = (() => async (request, context, runtime) => {
  const nodeReq: IncomingMessage | undefined = 'req' in runtime ? runtime.req : undefined

  if (nodeReq) {
    const needsUpgrade = globalStore.setupHMRProxy(nodeReq)

    if (needsUpgrade) {
      // Early response for HTTP connection upgrade
      return new Response(null)
    }
  }

  const handled = await connectToWeb(handleViteDevServer)(request, context, runtime)

  if (handled) return handled

  return (response) => {
    if (!response.headers.has('ETag')) {
      try {
        response.headers.set('Cache-Control', 'no-store')
      } catch {
        // Headers already sent
      }
    }
    return response
  }
}) satisfies Get<[], UniversalMiddleware>
