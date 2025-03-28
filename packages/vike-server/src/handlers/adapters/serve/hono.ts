import type { apply as applyAdapter } from '@universal-middleware/hono'
import type { MergedHonoServerOptions } from './hono-types.js'
import type { Callback } from '../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  _options: MergedHonoServerOptions,
  _callback?: Callback
) {
  return app
}
