import { Get, UniversalHandler, pipe } from '@universal-middleware/core'
import { VikeOptions } from './runtime/types.js'
import { compressMiddleware, renderPageHandler } from './runtime/vike-handler.js'

const renderPageUniversal = ((options?) => pipe(compressMiddleware(options), renderPageHandler(options))) satisfies Get<
  [options: VikeOptions],
  UniversalHandler
>

export default renderPageUniversal
