import type { Get, UniversalMiddleware } from '@universal-middleware/core'
import type { VikeOptions } from '../runtime/types.js'
import { renderPageHandler } from './vike.js'
import { getUniversalMiddlewares } from './utils.js'
import { compressMiddleware } from '../middlewares/compress.js'
import { serveStaticMiddleware } from '../middlewares/serveStatic.js'

const vikeMiddlewares = await getUniversalMiddlewares()

const renderPageUniversal: Get<[options?: VikeOptions], UniversalMiddleware[]> = (options?) => [
  // Do not make this a util, it is used by esbuild during build time to tree-shake and remove unused code
  ...(process.env.VIKE_RUNTIME === 'node' || process.env.VIKE_RUNTIME === 'bun' || process.env.VIKE_RUNTIME === 'deno'
    ? [compressMiddleware(options), serveStaticMiddleware(options)]
    : []),
  ...vikeMiddlewares,
  renderPageHandler(options)
]

export default renderPageUniversal
