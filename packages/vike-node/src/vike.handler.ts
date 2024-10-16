import { Get, UniversalHandler, pipe } from '@universal-middleware/core'
import { VikeOptions } from './runtime/types.js'
import { renderPageCompress, renderPageHandler } from './runtime/vike-handler.js'

const renderPageUniversal = ((options?) => pipe(renderPageCompress(options), renderPageHandler(options))) satisfies Get<
  [options: VikeOptions],
  UniversalHandler
>

export default renderPageUniversal
