import type { UniversalMiddleware } from '@universal-middleware/core'
import { compressMiddleware } from './middlewares/compress.js'
import { serveStaticMiddleware } from './middlewares/serveStatic.js'
import { renderPageHandler } from './middlewares/vike.js'
import type { VikeOptions } from './types.js'
import { getUniversalMiddlewares } from './utils.js'

const vikeMiddlewares = await getUniversalMiddlewares()

export function getMiddlewares<T = unknown>(options?: VikeOptions<T>): UniversalMiddleware[] {
  return [compressMiddleware(options), serveStaticMiddleware(options), ...vikeMiddlewares, renderPageHandler(options)]
}

export default getMiddlewares()
