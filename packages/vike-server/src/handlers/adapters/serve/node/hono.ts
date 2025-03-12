import type { apply as applyAdapter } from '@universal-middleware/hono'
import { serve as honoServe } from '@hono/node-server'
import { installServerHMR, onReady, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  const server = honoServe(
    {
      fetch: app.fetch,
      port: options.port,
      overrideGlobalObjects: false
    },
    onReady(options)
  )

  if (import.meta.hot) {
    installServerHMR(server)
  }

  return app
}
