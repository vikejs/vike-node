import type { apply as applyAdapter } from '@universal-middleware/hattip'
import { createServer } from '@hattip/adapter-node'
import { onReady, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  const handler = app.buildHandler()
  createServer(handler).listen(options.port, onReady(options))

  return handler
}
