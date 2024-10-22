import type { IncomingMessage, ServerResponse } from 'node:http'
// import { dirname, isAbsolute, join } from 'node:path'
// import { fileURLToPath } from 'node:url'
import type { HttpResponse } from 'uWebSockets.js'

import { assert } from '../utils/assert.js'
import { globalStore } from './globalStore.js'
import type { ConnectMiddleware, PlatformRequestUws, VikeOptions } from './types.js'
import { writeHttpResponseUws } from './utils/writeHttpResponse.js'
import { renderPage } from './vike-handler.js'
// import { isVercel } from '../utils/isVercel.js'

export function createHandler(options: VikeOptions<PlatformRequestUws> = {}) {
  // TODO
  // const staticConfig = resolveStaticConfig(options.static)
  // const shouldCache = staticConfig && staticConfig.cache
  // const compressionType = options.compress ?? !isVercel()
  // let staticMiddleware: ConnectMiddleware | undefined
  // let compressMiddleware: ConnectMiddleware | undefined

  return async function handler({
    res,
    platformRequest
  }: {
    res: HttpResponse
    platformRequest: PlatformRequestUws
  }): Promise<void> {
    if (globalStore.isPluginLoaded) {
      const handled = await handleViteDevServer(res, platformRequest)
      if (handled) {
        res.end()
        return
      }
    } else {
      // TODO
      // const isAsset = platformRequest.url?.startsWith('/assets/')
      // const shouldCompressResponse = compressionType === true || (compressionType === 'static' && isAsset)
      // if (shouldCompressResponse) {
      //   await applyCompression(req, res, shouldCache)
      // }
      // if (staticConfig) {
      //   const handled = await serveStaticFiles(req, res, staticConfig)
      //   if (handled) return true
      // }
    }

    const httpResponse = await renderPage({
      url: platformRequest.url,
      headers: platformRequest.headers,
      platformRequest,
      options
    })
    if (!httpResponse) {
      res.writeStatus('404').end()
      return
    }
    await writeHttpResponseUws(httpResponse, res)
    return
  }

  // TODO
  // async function applyCompression(req: IncomingMessage, res: ServerResponse, shouldCache: boolean) {
  //   if (!compressMiddleware) {
  //     const { default: shrinkRay } = await import('@nitedani/shrink-ray-current')
  //     compressMiddleware = shrinkRay({ cacheSize: shouldCache ? '128mB' : false }) as ConnectMiddleware
  //   }
  //   compressMiddleware(req, res, () => {})
  // }

  // TODO
  // async function serveStaticFiles(
  //   req: IncomingMessage,
  //   res: ServerResponse,
  //   config: { root: string; cache: boolean }
  // ): Promise<boolean> {
  //   if (!staticMiddleware) {
  //     const { default: sirv } = await import('sirv')
  //     staticMiddleware = sirv(config.root, { etag: true })
  //   }

  //   return new Promise<boolean>((resolve) => {
  //     res.once('close', () => resolve(true))
  //     staticMiddleware!(req, res, () => resolve(false))
  //   })
  // }
}

function handleViteDevServer(res: HttpResponse, platformRequest: PlatformRequestUws): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    res.once('close', () => resolve(true))
    assert(globalStore.viteDevServer)
    globalStore.viteDevServer.middlewares(
      platformRequest as unknown as IncomingMessage,
      res as unknown as ServerResponse,
      () => resolve(false)
    )
  })
}

// TODO
// function resolveStaticConfig(static_: VikeOptions['static']): false | { root: string; cache: boolean } {
//   // Disable static file serving for Vercel
//   // Vercel will serve static files on its own
//   // See vercel.json > outputDirectory
//   if (isVercel()) return false
//   if (static_ === false) return false

//   const argv1 = process.argv[1]
//   const entrypointDirAbs = argv1
//     ? dirname(isAbsolute(argv1) ? argv1 : join(process.cwd(), argv1))
//     : dirname(fileURLToPath(import.meta.url))
//   const defaultStaticDir = join(entrypointDirAbs, '..', 'client')

//   if (static_ === true || static_ === undefined) {
//     return { root: defaultStaticDir, cache: true }
//   }
//   if (typeof static_ === 'string') {
//     return { root: static_, cache: true }
//   }
//   return {
//     root: static_.root ?? defaultStaticDir,
//     cache: static_.cache ?? true
//   }
// }
