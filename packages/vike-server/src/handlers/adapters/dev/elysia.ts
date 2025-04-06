import { apply as applyAdapter } from '@universal-middleware/elysia'
import renderPageUniversal from '../../universal-dev.js'
import type { VikeOptions } from '../../../runtime/types.js'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'

export function apply(app: Parameters<typeof applyAdapter>[0], options?: VikeOptions<'elysia'>) {
  applyAdapter(app, renderPageUniversal({ ...options, vite: { middlewareMode: true } }))

  return app
}

export type RuntimeAdapter = RuntimeAdapterTarget<'elysia'>
