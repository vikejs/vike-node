import type { Get, UniversalMiddleware } from '@universal-middleware/core'
import type { VikeOptions, VikeOptionsInternal } from '../runtime/types.js'
import { renderPageHandler } from './vike.js'
import { getUniversalMiddlewares } from './utils.js'
import { devServerMiddleware } from '../middlewares/devServer.js'

const vikeMiddlewares = await getUniversalMiddlewares()

const renderPageUniversal: Get<[options?: VikeOptions & VikeOptionsInternal], UniversalMiddleware[]> = (options?) => [
  devServerMiddleware(options),
  ...vikeMiddlewares,
  renderPageHandler(options)
]

export default renderPageUniversal
