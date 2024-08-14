import { isNodeLike } from '../utils/isNodeLike.js'
import type { VikeOptions, WebHandler } from './types.js'

export function createHandler<PlatformRequest>(options: VikeOptions<PlatformRequest> = {}) {
  let nodeLike = undefined
  let nodeHandler: WebHandler | undefined = undefined
  let webHandler: WebHandler | undefined = undefined

  return async function handler({ request, platformRequest }: { request: Request; platformRequest: PlatformRequest }) {
    if (request.method !== 'GET') {
      return undefined
    }
    nodeLike ??= await isNodeLike()
    if (nodeLike) {
      if (!nodeHandler) {
        const connectToWeb = (await import('./adapters/connectToWeb.js')).connectToWeb
        const handler = (await import('./handler-node-only.js')).createHandler(options)
        nodeHandler = connectToWeb((req, res, next) => handler!({ req, res, platformRequest, next }))
      }
      return nodeHandler(request)
    }

    if (!webHandler) {
      const handler = (await import('./handler-web-only.js')).createHandler(options)
      webHandler = (request) => handler({ request, platformRequest })
    }

    return webHandler(request)
  }
}
