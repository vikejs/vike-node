export { renderPage }

import { renderPage as _renderPage } from 'vike/server'
import type { VikeHttpResponse, VikeOptions } from './types.js'

async function renderPage<PlatformRequest>({
  request,
  platformRequest,
  options
}: {
  request: { url?: string; headers: Record<string, any> }
  platformRequest: PlatformRequest
  options: VikeOptions<PlatformRequest>
}): Promise<VikeHttpResponse> {
  function getPageContext(platformRequest: PlatformRequest): Record<string, any> {
    return typeof options.pageContext === 'function' ? options.pageContext(platformRequest) : options.pageContext ?? {}
  }

  const pageContext = await _renderPage({
    urlOriginal: request.url ?? '',
    headersOriginal: request.headers,
    ...(await getPageContext(platformRequest))
  })

  if (pageContext.errorWhileRendering) {
    options.onError?.(pageContext.errorWhileRendering)
  }

  if (!pageContext.httpResponse) {
    return null
  }

  return pageContext.httpResponse
}
