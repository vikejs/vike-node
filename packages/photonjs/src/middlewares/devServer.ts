import type { IncomingMessage } from 'node:http'
import { enhance, type Get, type UniversalMiddleware } from '@universal-middleware/core'
import { connectToWeb } from '@universal-middleware/express'
import { handleViteDevServer } from '../runtime/adapters/handleViteDevServer.js'
import { globalStore } from '../runtime/globalStore.js'

export const devServerMiddleware = (() =>
  enhance(
    async (request, context, runtime) => {
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
    },
    {
      name: 'photonjs:dev-server',
      immutable: false
    }
  )) satisfies Get<[], UniversalMiddleware>
