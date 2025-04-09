import type { Get, UniversalMiddleware } from '@universal-middleware/core'
import { renderPageHandler } from './middlewares/vike.js'
import type { VikeOptions } from './types.js'
import { getUniversalMiddlewares } from './utils.js'

const vikeMiddlewares = await getUniversalMiddlewares()

export const getMiddlewares: Get<[options?: VikeOptions], UniversalMiddleware[]> = (options?) => [
  ...vikeMiddlewares,
  renderPageHandler(options)
]

export default getMiddlewares
