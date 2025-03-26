import type { apply as applyAdapter } from '@universal-middleware/hono'
import type { ServerOptions } from '../../serve.js'
import type { serve as honoServe } from '@hono/node-server'

type HonoServeOptions = Parameters<typeof honoServe>[0]
export function serve<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  _options: ServerOptions & Omit<HonoServeOptions, 'fetch' | 'port'>
) {
  return app
}
