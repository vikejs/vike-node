import type { Get, UniversalMiddleware } from '@universal-middleware/core'
import { connectToWeb } from '../runtime/adapters/connectToWeb.js'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { getGlobalContextAsync } from 'vike/server'
import { globalStore } from '../runtime/globalStore.js'
import { assert } from '../utils/assert.js'
import type { ConnectMiddleware, VikeOptions } from '../runtime/types.js'
import { isVercel } from '../utils/isVercel.js'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

async function removeBaseUrl(req: IncomingMessage) {
  if (!req.url) return
  const globalContext = await getGlobalContextAsync(!globalStore.isDev)
  const baseAssets = globalContext.baseAssets as string
  // Don't choke on older Vike versions
  if (baseAssets === undefined) return
  const { url } = req
  assert(url.startsWith('/'))
  let urlWithoutBase = url.slice(baseAssets.length)
  if (!urlWithoutBase.startsWith('/')) urlWithoutBase = `/${urlWithoutBase}`
  req.url = urlWithoutBase
}

function resolveStaticConfig(static_: VikeOptions['static']): false | { root: string; cache: boolean } {
  // Disable static file serving for Vercel
  // Vercel will serve static files on its own
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

export const serveStaticMiddleware = ((options?) => async (request, _context) => {
  const staticConfig = resolveStaticConfig(options?.static)
  let staticMiddleware: ConnectMiddleware | undefined

  // FIXME port sirv to universal-middleware
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

  const handled = await connectToWeb(serveStaticFiles)(request)
  if (handled) return handled
}) satisfies Get<[options: VikeOptions], UniversalMiddleware>
