import type { Get, UniversalMiddleware } from '@universal-middleware/core'
import type { VikeOptions } from '../runtime/types.js'
import { renderPageHandler } from './vike.js'
import { getUniversalMiddlewares } from './utils.js'
import { compressMiddleware } from '../middlewares/compress.js'
import { serveStaticMiddleware } from '../middlewares/serveStatic.js'

const vikeMiddlewares = await getUniversalMiddlewares()

const renderPageUniversal: Get<[options?: VikeOptions], UniversalMiddleware[]> = (options?) => [
  compressMiddleware(options),
  serveStaticMiddleware(options),
  ...vikeMiddlewares,
  renderPageHandler(options)
]

export default renderPageUniversal
