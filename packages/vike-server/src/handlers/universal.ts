import type { Get, RuntimeAdapter, UniversalMiddleware } from '@universal-middleware/core'
import type { VikeOptions } from '../runtime/types.js' // https://vike.dev/pageContext#typescript

// https://vike.dev/pageContext#typescript
declare global {
  namespace Vike {
    interface PageContext {
      runtime: RuntimeAdapter
    }
  }
}

let renderPageUniversal: Get<[options?: VikeOptions], UniversalMiddleware[]>

if (__DEV__) {
  const universalDev = await import('./universal-dev.js')
  renderPageUniversal = universalDev.default
} else {
  const universalProd = await import('./universal-prod.js')
  renderPageUniversal = universalProd.default
}

export default renderPageUniversal
