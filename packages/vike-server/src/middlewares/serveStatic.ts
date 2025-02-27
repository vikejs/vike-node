import type { Get, UniversalMiddleware } from '@universal-middleware/core'
import { url as getUrl } from '@universal-middleware/core'
import { getGlobalContextAsync } from 'vike/server'
import type { VikeOptions } from '../runtime/types.js'
import { isVercel } from '../utils/isVercel.js'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

function cloneRequestWithNewUrl(request: Request, newUrl: string) {
  return new Request(newUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    mode: request.mode,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer,
    integrity: request.integrity
  })
}

async function removeBaseUrl(req: Request) {
  if (!req.url) return req
  const globalContext = await getGlobalContextAsync(!__DEV__)
  const baseAssets = globalContext.baseAssets as string
  // Don't choke on older Vike versions
  if (baseAssets === undefined) return req
  const url = getUrl(req)
  let pathnameWithoutBase = url.pathname.slice(baseAssets.length)
  if (!pathnameWithoutBase.startsWith('/')) pathnameWithoutBase = `/${pathnameWithoutBase}`

  const newUrl = new URL(pathnameWithoutBase, url.origin)
  newUrl.search = url.search
  return cloneRequestWithNewUrl(req, newUrl.toString())
}

function resolveStaticConfig(static_: VikeOptions['static']): false | { root: string; cache: boolean } {
  // Disable static file serving for Vercel,
  // as it will serve static files on its own
  // See vercel.json > outputDirectory
  if (isVercel()) return false
  if (static_ === false) return false

  const argv1 = process.argv[1]
  const entrypointDirAbs = argv1
    ? dirname(isAbsolute(argv1) ? argv1 : join(process.cwd(), argv1))
    : dirname(fileURLToPath(import.meta.url))
  const defaultStaticDir = join(entrypointDirAbs, '..', 'client')

  if (static_ === true || static_ === undefined) {
    return { root: defaultStaticDir, cache: true }
  }
  if (typeof static_ === 'string') {
    return { root: static_, cache: true }
  }
  return {
    root: static_.root ?? defaultStaticDir,
    cache: static_.cache ?? true
  }
}

export const serveStaticMiddleware = ((options?) => async (request, context, runtime) => {
  const staticConfig = resolveStaticConfig(options?.static)
  let staticMiddleware: UniversalMiddleware

  async function serveStaticFiles(req: Request) {
    const newReq = await removeBaseUrl(req)

    if (!staticMiddleware) {
      const { default: sirv } = await import('@universal-middleware/sirv')
      staticMiddleware = sirv((staticConfig as { root: string; cache: boolean }).root, { etag: true })
    }

    return staticMiddleware(newReq, context, runtime)
  }

  return serveStaticFiles(request)
}) satisfies Get<[options: VikeOptions], UniversalMiddleware>
