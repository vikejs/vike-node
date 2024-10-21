export { renderPage, renderPageWeb }

import type { HttpResponse } from 'uWebSockets.js'
import { renderPage as _renderPage } from 'vike/server'
import type { VikeHttpResponse, VikeOptions } from './types.js'
import { writeHttpResponseUws } from './utils/writeHttpResponse.js'

async function renderPage<PlatformRequest>({
  url,
  headers,
  options,
  platformRequest
}: {
  url: string
  headers: [string, string][]
  options: VikeOptions<PlatformRequest>
  platformRequest: PlatformRequest
}): Promise<VikeHttpResponse> {
  async function getPageContext(platformRequest: PlatformRequest): Promise<Record<string, any>> {
    return typeof options.pageContext === 'function' ? options.pageContext(platformRequest) : options.pageContext ?? {}
  }

  const pageContext = await _renderPage({
    urlOriginal: url,
    headersOriginal: headers,
    ...(await getPageContext(platformRequest))
  })

  if (pageContext.errorWhileRendering) {
    options.onError?.(pageContext.errorWhileRendering)
  }

  return pageContext.httpResponse
}

async function renderPageWeb<PlatformRequest>({
  res,
  url,
  headers,
  platformRequest,
  options
}: {
  res: HttpResponse,
  url: string
  headers: [string, string][]
  platformRequest: PlatformRequest
  options: VikeOptions<PlatformRequest>
}): Promise<void> {
  const httpResponse = await renderPage({
    url,
    headers,
    platformRequest,
    options
  })

  if (!httpResponse) {
    res.writeStatus('404').end('Not found')
    return
  }

  await writeHttpResponseUws(httpResponse, res)
}
