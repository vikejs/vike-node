import type { apply as applyAdapter } from '@universal-middleware/elysia'
import { denoServe, type ServerOptionsBase } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptionsBase) {
  denoServe(options, app.fetch)

  return app
}
