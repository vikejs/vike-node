import { apply as applyAdapter } from '@universal-middleware/h3'
import renderPageUniversal from '../universal.js'
import type { VikeOptions } from '../../runtime/types.js'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'

export function apply(app: Parameters<typeof applyAdapter>[0], options?: VikeOptions) {
  return applyAdapter(app, renderPageUniversal(options))
}

export type RuntimeAdapter = RuntimeAdapterTarget<'h3'>
