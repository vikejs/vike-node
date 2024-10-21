import type { HttpRequest } from 'uWebSockets.js'
import type { HandlerUws, PlatformRequestUws, VikeOptions } from './types.js'
import { renderPageWeb } from './vike-handler-uws.js'

export function createHandler(options: VikeOptions<HttpRequest> = {}): HandlerUws<PlatformRequestUws> {
  return async function handler({ res, platformRequest }) {
    return renderPageWeb({ res, url: platformRequest.url, headers: platformRequest.headers, platformRequest, options })
  }
}
