import { apply as applyAdapter } from '@universal-middleware/h3'
import renderPageUniversal from '../../universal-dev.js'
import type { VikeOptions } from '../../../runtime/types.js'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'

export function apply<App extends Parameters<typeof applyAdapter>[0]>(app: App, options?: VikeOptions<'h3'>) {
  applyAdapter(app, renderPageUniversal(options))

  return app
}

export type RuntimeAdapter = RuntimeAdapterTarget<'h3'>
