import type { apply as applyAdapter } from '@universal-middleware/fastify'
import { onReady, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  app.listen(
    {
      port: options.port
    },
    onReady(options)
  )

  return app
}
