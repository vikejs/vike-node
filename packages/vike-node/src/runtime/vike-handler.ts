import { parseHeaders } from './utils/header-utils.js'
import { renderPage as _renderPage } from 'vike/server'
import type { VikeHttpResponse, VikeOptions } from './types.js'
import type { Get, UniversalHandler } from '@universal-middleware/core'
import { globalStore } from './globalStore.js'
import { assert } from '../utils/assert.js'
import type { IncomingMessage, ServerResponse } from 'http'
import { connectToWebFallback } from './adapters/connectToWeb.js'

export { renderPage, renderPageWeb }

async function renderPage<PlatformRequest>({
  url,
  headers,
  options
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

export const renderPageUniversal = ((options?) => async (request, context, runtime: any) => {
  if (globalStore.isPluginLoaded) {
    const handled = await web(request)

    // console.log({ url: request.url, handled: Boolean(handled) })
    if (handled) return handled
  } else {
    // const isAsset = req.url?.startsWith('/assets/')
    // const shouldCompressResponse = compressionType === true || (compressionType === 'static' && isAsset)
    // if (shouldCompressResponse) {
    //   await applyCompression(req, res, shouldCache)
    // }
    //
    // if (staticConfig) {
    //   const handled = await serveStaticFiles(req, res, staticConfig)
    //   if (handled) return true
    // }
  }

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

const web = connectToWebFallback(handleViteDevServer)

function handleViteDevServer(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    res.once('close', () => {
      resolve(true)
    })
    assert(globalStore.viteDevServer)
    globalStore.viteDevServer.middlewares(req, res, () => {
      resolve(false)
    })
  })
}
