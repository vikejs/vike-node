import type { apply as applyAdapter } from '@universal-middleware/express'
import { onReady, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  app.listen(options.port, onReady(options))

  return app
}
