import type { VikeOptions } from './types.js'
import { renderPageWeb } from './vike-handler.js'

export function createHandler<PlatformRequest>(options: VikeOptions<PlatformRequest> = {}) {
  return async function handler({ request, platformRequest }: { request: Request; platformRequest: PlatformRequest }) {
    if (request.method !== 'GET') {
      return undefined
    }
    return renderPageWeb({ request, platformRequest, options })
  }
}
