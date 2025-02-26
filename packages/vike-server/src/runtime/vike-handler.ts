import { enhance, type Get, type RuntimeAdapter, type UniversalHandler } from '@universal-middleware/core'
import { renderPage as _renderPage } from 'vike/server'
import type { VikeHttpResponse, VikeOptions } from './types.js'
import { parseHeaders } from './utils/header-utils.js'

async function renderPage<T extends RuntimeAdapter>({
  url,
  headers,
  runtimeRequest,
  options
}: {
  url: string
  headers: [string, string][]
  runtimeRequest: T
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  options: VikeOptions & { pageContextUniversal?: Record<string, any> }
}): Promise<VikeHttpResponse> {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const pageContextInit: Record<string, any> = options.pageContextUniversal ?? {}
  if (typeof options?.pageContext === 'function') {
    Object.assign(pageContextInit, await options.pageContext(runtimeRequest))
  } else if (options?.pageContext) {
    Object.assign(pageContextInit, options.pageContext)
  }

  const pageContext = await _renderPage({
    ...pageContextInit,
    urlOriginal: url,
    headersOriginal: headers
  })

  if (pageContext.errorWhileRendering) {
    options.onError?.(pageContext.errorWhileRendering)
  }

  return pageContext.httpResponse
}

export const renderPageHandler = ((options?) =>
  enhance(
    async (request, context, runtime) => {
      const pageContextInit = { ...context, runtime, urlOriginal: request.url, headersOriginal: request.headers }
      const response = await renderPage({
        url: request.url,
        headers: parseHeaders(request.headers),
        runtimeRequest: runtime,
        options: {
          ...options,
          pageContextUniversal: pageContextInit,
          pageContext: options?.pageContext
        }
      })

      return new Response(response.getReadableWebStream(), {
        status: response.statusCode,
        headers: response.headers
      })
    },
    {
      order: 0
    }
  )) satisfies Get<[options: VikeOptions], UniversalHandler>
