import type { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { isNodeLike } from '../utils/isNodeLike.js'
import { connectToWeb } from './adapters/connectToWeb.js'
import { createHandler as createHandlerNode } from './handler-node-only-uws.js'
import { createHandler as createHandlerWeb } from'./handler-web-only-uws.js'
import type { PlatformRequestUws, VikeOptions } from './types.js'

const getHeaders = (req: HttpRequest): [string, string][] => {
  const headers: [string, string][] = []

  req.forEach((key, value) => {
    headers.push([key, value])
  })

  return headers
}

type Handler<PlatformRequestUws> = (params: {
  response: HttpResponse
  request: HttpRequest
  platformRequest: PlatformRequestUws
}) => Promise<void>

export function createHandler<HttpRequest>(options: VikeOptions<HttpRequest> = {}): Handler<PlatformRequestUws> {
  return async function handler({ response, request, platformRequest }) {
    response.onAborted(() => {
      response.isAborted = true
    })

    if (request.getMethod() !== 'get') {
      response.writeStatus('405').end()
      return
    }

    platformRequest.url = request.getUrl()
    platformRequest.headers = getHeaders(request)

    if (await isNodeLike()) {
      const nodeOnlyHandler = createHandlerNode(options)
      const nodeHandler: Handler<PlatformRequestUws> = ({ request, platformRequest }) => {
        const connectedHandler = connectToWeb((req, res) =>
          nodeOnlyHandler({ req, res, platformRequest })
        )
        return connectedHandler(request)
      }

      await nodeHandler({ request, platformRequest })
    } else {
      const webHandler: Handler<PlatformRequestUws> = createHandlerWeb(options)
      await webHandler({ platformRequest })
    }
  }
}