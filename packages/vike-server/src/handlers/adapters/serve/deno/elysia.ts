import type { apply as applyAdapter } from '@universal-middleware/elysia'
import { type Callback, denoServe, type ServerOptionsBase } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  options: ServerOptionsBase,
  callback?: Callback
) {
  denoServe(options, app.fetch, callback)

  return app
}
