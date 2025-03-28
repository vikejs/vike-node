import type { apply as applyAdapter } from '@universal-middleware/hono'
import { bunServe, type Callback } from '../../../serve.js'
import type { MergedHonoServerOptions } from '../hono-types.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  options: MergedHonoServerOptions,
  callback?: Callback
) {
  bunServe(options, app.fetch, callback)

  return app
}
