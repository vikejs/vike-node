import { apply as applyAdapter } from '@universal-middleware/fastify'
import renderPageUniversal from '../../universal-dev.js'
import type { VikeOptions } from '../../../runtime/types.js'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'

export async function apply<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  options?: VikeOptions<'fastify'>
) {
  await applyAdapter(app, renderPageUniversal(options))

  return app
}

export type RuntimeAdapter = RuntimeAdapterTarget<'fastify'>
