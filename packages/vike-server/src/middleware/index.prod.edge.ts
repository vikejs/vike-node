import type { Get, UniversalMiddleware } from '@universal-middleware/core'
import { getUniversalMiddlewares } from './utils.js'
import { renderPageHandler } from './middlewares/vike.js'
import type { VikeOptions } from './types.js'

const vikeMiddlewares = await getUniversalMiddlewares()

const renderPageUniversal: Get<[options?: VikeOptions], UniversalMiddleware[]> = (options?) => [
  ...vikeMiddlewares,
  renderPageHandler(options)
]

export default renderPageUniversal
