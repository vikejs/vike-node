import type { apply as applyAdapter } from '@universal-middleware/elysia'
import { getPort, onReady, type ServerOptionsBase } from '../utils.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptionsBase) {
  const port = getPort(options)
  return app.listen(
    {
      port,
      hostname: options?.hostname
    },
    onReady({ ...options, port })
  )
}
