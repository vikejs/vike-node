import type { IncomingMessage, ServerResponse } from 'node:http'
import compressMiddlewareFactory from '@universal-middleware/compress'
import type { Get, RuntimeAdapter, UniversalHandler, UniversalMiddleware } from '@universal-middleware/core'
import { renderPage as _renderPage, getGlobalContextAsync } from 'vike/server'
import { isVercel } from '../utils/isVercel.js'
import { connectToWeb } from './adapters/connectToWeb.js'
import { globalStore } from './globalStore.js'
import type { ConnectMiddleware, VikeHttpResponse, VikeOptions } from './types.js'
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

export const compressMiddleware = ((options?) => async (request, _context) => {
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

export const renderPageHandler = ((options?) => async (request, context, runtime) => {
  const nodeReq: IncomingMessage | undefined = 'req' in runtime ? runtime.req : undefined
  let staticConfig: false | { root: string; cache: boolean } = false
  let staticMiddleware: ConnectMiddleware | undefined

  if (nodeReq) {
    const needsUpgrade = globalStore.setupHMRProxy(nodeReq)

    if (needsUpgrade) {
      // Early response for HTTP connection upgrade
      return new Response(null)
    }

    const { resolveStaticConfig } = await import('./utils/resolve-static-config.js')
    staticConfig = resolveStaticConfig(options?.static)
  }

  if (globalStore.isDev) {
    const { handleViteDevServer } = await import('./adapters/handleViteDevServer.js')
    const handled = await connectToWeb(handleViteDevServer)(request)
    if (handled) return handled
  } else if (nodeReq) {
    if (staticConfig) {
      const handled = await connectToWeb(serveStaticFiles)(request)
      if (handled) return handled
    }
  }

  async function serveStaticFiles(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    await removeBaseUrl(req)

    if (!staticMiddleware) {
      const { default: sirv } = await import('sirv')
      staticMiddleware = sirv((staticConfig as { root: string; cache: boolean }).root, { etag: true })
    }

    return new Promise<boolean>((resolve) => {
      res.once('close', () => resolve(true))
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      staticMiddleware!(req, res, () => resolve(false))
    })
  }

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
}) satisfies Get<[options: VikeOptions], UniversalHandler>

async function removeBaseUrl(req: IncomingMessage) {
  if (!req.url) return
  const globalContext = await getGlobalContextAsync(!globalStore.isDev)
  // @ts-expect-error not released yet
  const baseAssets = globalContext.baseAssets as string
  // Don't choke on older Vike versions
  if (baseAssets === undefined) return
  const { url } = req
  assert(url.startsWith('/'))
  let urlWithoutBase = url.slice(baseAssets.length)
  if (!urlWithoutBase.startsWith('/')) urlWithoutBase = '/'
  req.url = urlWithoutBase
}
