import { node } from '@elysiajs/node'
import type { apply as applyAdapter } from '@universal-middleware/elysia'
import { getPort, onReady, type ServerOptionsBase } from '../utils.js'
import { Elysia } from 'elysia'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptionsBase) {
  // TODO HMR
  const port = getPort(options)
  return new Elysia({ adapter: node() }).mount(app).listen(
    {
      port,
      hostname: options?.hostname
    },
    onReady({ ...options, port })
  )
}
