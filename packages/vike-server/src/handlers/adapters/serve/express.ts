import type { apply as applyAdapter } from '@universal-middleware/express'
import type { Callback, ServerOptions } from '../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  _options: ServerOptions,
  _callback?: Callback
) {
  return app
}
