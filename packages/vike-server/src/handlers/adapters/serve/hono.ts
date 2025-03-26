import type { apply as applyAdapter } from '@universal-middleware/hono'
import type { MergedHonoServerOptions } from './hono-types.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, _options: MergedHonoServerOptions) {
  return app
}
