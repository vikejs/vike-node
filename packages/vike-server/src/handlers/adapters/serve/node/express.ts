import type { apply as applyAdapter } from '@universal-middleware/express'
import { installServerHMR, onReady, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  const server = app.listen(options.port, onReady(options))

  if (import.meta.hot) {
    installServerHMR(server)
  }

  return app
}
