import type { Get, UniversalMiddleware } from '@universal-middleware/core'
import { compressMiddleware } from './middlewares/compress.js'
import { serveStaticMiddleware } from './middlewares/serveStatic.js'
import { getUniversalMiddlewares } from './utils.js'
import { renderPageHandler } from './middlewares/vike.js'
import type { VikeOptions } from './types.js'

const vikeMiddlewares = await getUniversalMiddlewares()

const renderPageUniversal: Get<[options?: VikeOptions], UniversalMiddleware[]> = (options?) => [
  compressMiddleware(options),
  serveStaticMiddleware(options),
  ...vikeMiddlewares,
  renderPageHandler(options)
]

export default renderPageUniversal
