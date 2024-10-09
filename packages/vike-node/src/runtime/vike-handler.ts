export { renderPage, renderPageWeb }

import { renderPage as _renderPage } from 'vike/server'
import type { VikeHttpResponse, VikeOptions } from './types.js'
import type { Get, UniversalHandler } from '@universal-middleware/core'

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
  async function getPageContext(platformRequest: PlatformRequest): Record<string, any> | Promise<Record<string, any>> {
    return typeof options.pageContext === 'function'
      ? options.pageContext(platformRequest)
      : (options.pageContext ?? {})
  }

  const pageContext = await _renderPage({
    ...(await getPageContext(platformRequest)),
    urlOriginal: url,
    headersOriginal: headers
  })

  if (pageContext.errorWhileRendering) {
    options.onError?.(pageContext.errorWhileRendering)
  }

  return pageContext.httpResponse
}

async function renderPageWeb<PlatformRequest>({
  url,
  headers,
  platformRequest,
  options
}: {
  url: string
  headers: [string, string][]
  platformRequest: PlatformRequest
  options: VikeOptions<PlatformRequest>
}) {
  const httpResponse = await renderPage({
    url,
    headers,
    platformRequest,
    options
  })
  if (!httpResponse) return undefined

  const { readable, writable } = new TransformStream()
  httpResponse.pipe(writable)

  return new Response(readable, { status: httpResponse.statusCode, headers: httpResponse.headers })
}

export const renderPageUniversal = (() => async (request, context, runtime) => {
  const pageContextInit = { ...context, ...runtime, urlOriginal: request.url, headersOriginal: request.headers }
  const pageContext = await _renderPage(pageContextInit)
  const response = pageContext.httpResponse

  const { readable, writable } = new TransformStream()
  response.pipe(writable)

  return new Response(readable, {
    status: response.statusCode,
    headers: response.headers
  })
}) satisfies Get<[], UniversalHandler>
