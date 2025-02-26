import type { Get, UniversalMiddleware } from '@universal-middleware/core'
import { connectToWeb } from '../runtime/adapters/connectToWeb.js'
import { handleViteDevServer } from '../runtime/adapters/handleViteDevServer.js'
import type { IncomingMessage } from 'node:http'
import { globalStore } from '../runtime/globalStore.js'

export const devServerMiddleware = (() => async (request, _context, runtime) => {
  const nodeReq: IncomingMessage | undefined = 'req' in runtime ? runtime.req : undefined

  if (nodeReq) {
    const needsUpgrade = globalStore.setupHMRProxy(nodeReq)

    if (needsUpgrade) {
      // Early response for HTTP connection upgrade
      return new Response(null)
    }
  }

  const handled = await connectToWeb(handleViteDevServer)(request)

  if (handled) return handled
}) satisfies Get<[], UniversalMiddleware>
