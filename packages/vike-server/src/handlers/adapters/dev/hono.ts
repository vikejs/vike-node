import { apply as applyAdapter } from '@universal-middleware/hono'
import renderPageUniversal from '../../universal-dev.js'
import type { VikeOptions } from '../../../runtime/types.js'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'

export function apply<App extends Parameters<typeof applyAdapter>[0]>(app: App, options?: VikeOptions<'hono'>) {
  applyAdapter(app, renderPageUniversal({ ...options, vite: { middlewareMode: true } }))

  return app
}

export type RuntimeAdapter = RuntimeAdapterTarget<'hono'>
