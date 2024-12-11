import { Get, type RuntimeAdapter, type UniversalHandler, pipe } from '@universal-middleware/core'
import type { VikeOptions } from './runtime/types.js'
import { compressMiddleware, renderPageHandler } from './runtime/vike-handler.js'

// https://vike.dev/pageContext#typescript
declare global {
  namespace Vike {
    interface PageContext {
      runtime: RuntimeAdapter
    }
  }
}

const renderPageUniversal = ((options?) => pipe(compressMiddleware(options), renderPageHandler(options))) satisfies Get<
  [options: VikeOptions],
  UniversalHandler
>

export default renderPageUniversal
