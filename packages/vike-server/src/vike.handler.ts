import { type Get, pipe, type RuntimeAdapter, type UniversalHandler } from '@universal-middleware/core'
import type { VikeOptions } from './runtime/types.js'
import { renderPageHandler } from './runtime/vike-handler.js'
import { globalStore } from './runtime/globalStore.js'

// https://vike.dev/pageContext#typescript
declare global {
  namespace Vike {
    interface PageContext {
      runtime: RuntimeAdapter
    }
  }
}

let renderPageUniversal: Get<[options: VikeOptions], UniversalHandler>

if (globalStore.isDev) {
  const { devServerMiddleware } = await import('./middlewares/devServer.js')
  renderPageUniversal = (options?) => pipe(devServerMiddleware(), renderPageHandler(options))
} else {
  const { compressMiddleware } = await import('./middlewares/compress.js')
  const { serveStaticMiddleware } = await import('./middlewares/serveStatic.js')
  renderPageUniversal = (options?) =>
    pipe(compressMiddleware(options), serveStaticMiddleware(options), renderPageHandler(options))
}

export default renderPageUniversal
