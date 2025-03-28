import type { apply as applyAdapter } from '@universal-middleware/elysia'
import type { Callback, ServerOptionsBase } from '../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  _options: ServerOptionsBase,
  _callback?: Callback
) {
  return app
}
