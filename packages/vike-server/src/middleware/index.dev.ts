import type { Get, UniversalMiddleware } from '@universal-middleware/core'
import { renderPageHandler } from './middlewares/vike.js'
import type { VikeOptions, VikeOptionsInternal } from './types.js'
import { getUniversalMiddlewares } from './utils.js'

const vikeMiddlewares = await getUniversalMiddlewares()

export const getMiddlewares: Get<[options?: VikeOptions & VikeOptionsInternal], UniversalMiddleware[]> = (options?) => [
  ...vikeMiddlewares,
  renderPageHandler(options)
]

export default getMiddlewares
