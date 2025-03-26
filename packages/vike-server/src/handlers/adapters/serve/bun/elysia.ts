import type { apply as applyAdapter } from '@universal-middleware/elysia'
import { onReady, type ServerOptionsBase } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptionsBase) {
  return app.listen(options.port, onReady(options))
}
