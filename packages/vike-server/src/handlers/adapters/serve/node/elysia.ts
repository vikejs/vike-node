import type { apply as applyAdapter } from '@universal-middleware/elysia'
import { getPort, onReady, type ServerOptionsBase } from '../../../serve.js'
import { Elysia } from 'elysia'
import { node } from '@elysiajs/node'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptionsBase) {
  // TODO HMR
  const port = getPort(options)
  return new Elysia({ adapter: node() }).mount(app).listen(port, onReady({ ...options, port }))
}
