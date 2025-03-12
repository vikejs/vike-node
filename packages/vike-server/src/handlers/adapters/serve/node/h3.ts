import type { apply as applyAdapter } from '@universal-middleware/h3'
import { createServer } from 'node:http'
import { toNodeListener } from 'h3'
import { onReady, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  createServer(toNodeListener(app)).listen(options.port, onReady(options))

  return app
}
