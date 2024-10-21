import type { HttpRequest } from 'uWebSockets.js'
import type { PlatformRequestUws, VikeOptions } from './types.js'
import { renderPageWebUws } from './vike-handler-uws.js'

export function createHandler(options: VikeOptions<HttpRequest> = {}): Promise<void> {
  return async function handler({ platformRequest }: {
    platformRequest: PlatformRequestUws
  }) {
    await renderPageWebUws({ url: platformRequest.url, headers: platformRequest.headers, platformRequest, options })
  }
}
