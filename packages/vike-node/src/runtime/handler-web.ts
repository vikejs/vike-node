import { assert } from '../utils/assert.js'
import { isNodeLike } from '../utils/isNodeLike.js'
import { globalStore } from './globalStore.js'
import { VikeOptions, WebHandler } from './types.js'
import { renderPage } from './vike-handler.js'

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
        const handler = (await import('./handler.js')).createHandler(options)
        nodeHandler = connectToWeb((req, res, next) => handler!({ req, res, platformRequest, next }))
      }
      return nodeHandler(request)
    }

    const httpResponse = await renderPage({
      request,
      platformRequest,
      options
    })
    if (!httpResponse) return undefined
    const { statusCode, headers, getReadableWebStream } = httpResponse
    return new Response(getReadableWebStream(), { status: statusCode, headers })
  }
}
