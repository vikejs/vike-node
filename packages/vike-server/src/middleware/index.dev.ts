import type { UniversalMiddleware } from '@universal-middleware/core'
import { renderPageHandler } from './middlewares/vike.js'
import type { VikeOptions } from './types.js'
import { getUniversalMiddlewares } from './utils.js'

const vikeMiddlewares = await getUniversalMiddlewares()

export function getMiddlewares<T = unknown>(options?: VikeOptions<T>): UniversalMiddleware[] {
  return [...vikeMiddlewares, renderPageHandler(options)]
}

export default getMiddlewares
