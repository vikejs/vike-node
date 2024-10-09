import { isNodeLike } from '../utils/isNodeLike.js'
import type { VikeOptions } from './types.js'

type Handler<PlatformRequest> = (params: {
  request: Request
  platformRequest: PlatformRequest
}) => Response | undefined | Promise<Response | undefined>

export function createHandler<PlatformRequest>(options: VikeOptions = {}): Handler<PlatformRequest> {
  let nodeLike: boolean | undefined = undefined
  let nodeHandler: Handler<PlatformRequest> | undefined = undefined
  let webHandler: Handler<PlatformRequest> | undefined = undefined

  return async function handler({ request, platformRequest }) {
    if (request.method !== 'GET') {
      return undefined
    }

    nodeLike ??= await isNodeLike()

    if (nodeLike) {
      if (!nodeHandler) {
        const { connectToWeb } = await import('./adapters/connectToWeb.js')
        const { createHandler } = await import('./handler-node-only.js')
        const nodeOnlyHandler = createHandler(options)
        nodeHandler = ({ request, platformRequest }) => {
          const connectedHandler = connectToWeb((req, res, next) =>
            nodeOnlyHandler({ req, res, platformRequest, next })
          )
          return connectedHandler(request)
        }
      }

      return nodeHandler({ request, platformRequest })
    }

    if (!webHandler) {
      const { createHandler } = await import('./handler-web-only.js')
      webHandler = createHandler(options)
    }

    return webHandler({ request, platformRequest })
  }
}
