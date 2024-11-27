import type { IncomingMessage, ServerResponse } from 'http'
import compressMiddlewareFactory from '@universal-middleware/compress'
import { type Get, type UniversalHandler, type UniversalMiddleware } from '@universal-middleware/core'
import { renderPage as _renderPage } from 'vike/server'
import { assert } from '../utils/assert.js'
import { isVercel } from '../utils/isVercel.js'
import { connectToWeb } from './adapters/connectToWeb.js'
import { globalStore } from './globalStore.js'
import type { ConnectMiddleware, VikeHttpResponse, VikeOptions } from './types.js'
import { parseHeaders } from './utils/header-utils.js'

export { renderPage }

async function renderPage({
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

export const compressMiddleware = ((options?) => async (request, _context, runtime: any) => {
  const compressionType = options?.compress ?? !isVercel()
  const compressMiddlewareInternal = compressMiddlewareFactory()(request)

  return async (response) => {
    if (!globalStore.isDev) {
      const isAsset = new URL(request.url).pathname.startsWith('/assets/')
      const shouldCompressResponse = compressionType === true || (compressionType === 'static' && isAsset)
      if (shouldCompressResponse) {
        return compressMiddlewareInternal(response)
      }
    }
    return response
  }
}) satisfies Get<[options: VikeOptions], UniversalMiddleware>

export const renderPageHandler = ((options?) => async (request, context, runtime: any) => {
  const nodeReq: IncomingMessage | undefined = runtime.req
  let staticConfig: false | { root: string; cache: boolean } = false
  let staticMiddleware: ConnectMiddleware | undefined

  if (nodeReq) {
    globalStore.setupHMRProxy(nodeReq)
    const { resolveStaticConfig } = await import('./utils/resolve-static-config.js')
    staticConfig = resolveStaticConfig(options?.static)
  }

  if (globalStore.isDev) {
    const handled = await web(request)

    if (handled) return handled
  } else if (nodeReq) {
    if (staticConfig) {
      const handled = await connectToWeb(serveStaticFiles)(request)
      if (handled) return handled
    }
  }

  async function serveStaticFiles(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    if (!staticMiddleware) {
      const { default: sirv } = await import('sirv')
      staticMiddleware = sirv((staticConfig as { root: string; cache: boolean }).root, { etag: true })
    }

    return new Promise<boolean>((resolve) => {
      res.once('close', () => resolve(true))
      staticMiddleware!(req, res, () => resolve(false))
    })
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

  return new Response(response.getReadableWebStream(), {
    status: response.statusCode,
    headers: response.headers
  })
}) satisfies Get<[options: VikeOptions], UniversalHandler>

const web = connectToWeb(handleViteDevServer)

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
