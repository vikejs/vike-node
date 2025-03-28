import type { apply as applyAdapter } from '@universal-middleware/elysia'
import { type Callback, onReady, type ServerOptionsBase } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  options: ServerOptionsBase,
  callback?: Callback
) {
  return app.listen(options.port, onReady({ callback, ...options }))
}
