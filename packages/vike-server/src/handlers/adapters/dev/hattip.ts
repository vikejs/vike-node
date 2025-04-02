import { apply as applyAdapter } from '@universal-middleware/hattip'
import renderPageUniversal from '../../universal-dev.js'
import type { VikeOptions } from '../../../runtime/types.js'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'

export function apply<App extends Parameters<typeof applyAdapter>[0]>(app: App, options?: VikeOptions<'hattip'>) {
  applyAdapter(app, renderPageUniversal({ ...options, vite: { middlewareMode: true } }))

  return app
}

export type RuntimeAdapter = RuntimeAdapterTarget<'hattip'>
