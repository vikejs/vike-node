import { parseHeaders } from './utils/header-utils.js'

export { renderPage, renderPageWeb }

import { renderPage as _renderPage } from 'vike/server'
import type { VikeHttpResponse, VikeOptions } from './types.js'
import type { Get, UniversalHandler } from '@universal-middleware/core'

async function renderPage<PlatformRequest>({
  url,
  headers,
  options,
}: {
  url: string
  headers: [string, string][]
  options: VikeOptions
}): Promise<VikeHttpResponse> {
  const pageContext = await _renderPage({
    ...options?.pageContext,
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
  options
}: {
  url: string
  headers: [string, string][]
  platformRequest: PlatformRequest
  options: VikeOptions
}) {
  const httpResponse = await renderPage({
    url,
    headers,
    options
  })
  if (!httpResponse) return undefined

  const { readable, writable } = new TransformStream()
  httpResponse.pipe(writable)

  return new Response(readable, { status: httpResponse.statusCode, headers: httpResponse.headers })
}

export const renderPageUniversal = ((options?) => async (request, context, runtime) => {
  const pageContextInit = { ...context, ...runtime, urlOriginal: request.url, headersOriginal: request.headers }
  const response = await renderPage({
    url: request.url,
    headers: parseHeaders(request.headers),
    options: {
      ...options,
      pageContext: {
        ...pageContextInit,
        ...options?.pageContext
      }
    }
  })

  const { readable, writable } = new TransformStream()
  response.pipe(writable)

  return new Response(readable, {
    status: response.statusCode,
    headers: response.headers
  })
}) satisfies Get<[options: VikeOptions], UniversalHandler>
