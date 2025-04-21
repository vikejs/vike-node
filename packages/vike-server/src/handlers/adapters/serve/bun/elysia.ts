import type { apply as applyAdapter } from '@universal-middleware/elysia'
import { getHost, getPort, onReady, type ServerOptionsBase } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptionsBase) {
  const port = getPort(options)
  const hostname = getHost(options)
  return app.listen(
    {
      port,
      hostname
    },
    onReady({ ...options, port })
  )
}
