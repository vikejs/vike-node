import { type Get, pipeRoute, type UniversalMiddleware } from '@universal-middleware/core'
import type { VikeOptions } from '../runtime/types.js'
import { renderPageHandler } from './vike.js'
import { getUniversalMiddlewares } from './utils.js'
import { devServerMiddleware } from '../middlewares/devServer.js'

const vikeMiddlewares = await getUniversalMiddlewares();

const renderPageUniversal: Get<[options?: VikeOptions], UniversalMiddleware> = (options?) =>
  pipeRoute([devServerMiddleware(), ...vikeMiddlewares, renderPageHandler(options)], {});

export default renderPageUniversal;
