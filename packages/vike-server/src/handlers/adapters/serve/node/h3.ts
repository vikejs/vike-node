import type { apply as applyAdapter } from '@universal-middleware/h3'
import { createServer } from 'node:http'
import { toNodeListener } from 'h3'
import { installServerHMR, onReady, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  const _serve = () => createServer(toNodeListener(app)).listen(options.port, onReady(options))

  if (import.meta.hot) {
    installServerHMR(_serve)
  } else {
    _serve()
  }

  return app
}
