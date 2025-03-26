import type { apply as applyAdapter } from '@universal-middleware/hattip'
import { installServerHMR, type NodeHandler, nodeServe, type ServerOptions } from '../../../serve.js'
import { createMiddleware } from '@hattip/adapter-node'
import { createServer } from 'node:http'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  if (!options.createServer) options.createServer = createServer
  const handler = app.buildHandler()
  const listener = createMiddleware(handler)
  const _serve = () => nodeServe(options, listener as NodeHandler)

  if (import.meta.hot) {
    installServerHMR(_serve)
  } else {
    _serve()
  }

  return handler
}
