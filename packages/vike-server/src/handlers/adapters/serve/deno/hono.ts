import type { apply as applyAdapter } from '@universal-middleware/hono'
import { denoServe } from '../../../serve.js'
import type { MergedHonoServerOptions } from '../hono-types.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: MergedHonoServerOptions) {
  denoServe(options, app.fetch)

  return app
}
