import type { apply as applyAdapter } from '@universal-middleware/hono'
import { denoServe, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  denoServe(options, app.fetch)

  return app
}
