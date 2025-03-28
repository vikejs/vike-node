import type { apply as applyAdapter } from '@universal-middleware/express'
import { type Callback, installServerHMR, nodeServe, type ServerOptions } from '../../../serve.js'
import { createServer } from 'node:http'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  options: ServerOptions,
  callback?: Callback
) {
  if (!options.createServer) options.createServer = createServer
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const _serve = () => nodeServe(options, app as any, callback)

  if (import.meta.hot) {
    installServerHMR(_serve)
  } else {
    _serve()
  }

  return app
}
