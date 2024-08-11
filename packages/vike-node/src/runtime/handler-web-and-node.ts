import { isNodeLike } from '../utils/isNodeLike.js'
import type { VikeOptions, WebHandler } from './types.js'
import { renderPageWeb } from './vike-handler.js'

export function createHandler<PlatformRequest>(options: VikeOptions<PlatformRequest> = {}) {
  let nodeLike = undefined
  let nodeHandler: WebHandler | undefined = undefined

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

    return renderPageWeb({ request, platformRequest, options })
  }
}
