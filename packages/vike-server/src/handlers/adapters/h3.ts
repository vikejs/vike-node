import { apply as applyAdapter } from '@universal-middleware/hono'
import renderPageUniversal from '../universal.js'
import type { VikeOptions } from '../../runtime/types.js'

export function apply(app: Parameters<typeof applyAdapter>[0], options?: VikeOptions) {
  return applyAdapter(app, renderPageUniversal(options));
}
