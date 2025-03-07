import type { apply as applyAdapter } from '@universal-middleware/hono'
import { serve as honoServe } from '@hono/node-server'
import { onReady, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  honoServe(
    {
      fetch: app.fetch,
      port: options.port,
      overrideGlobalObjects: false
    },
    onReady(options)
  )

  return app
}
