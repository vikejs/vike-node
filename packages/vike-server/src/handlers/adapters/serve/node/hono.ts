import type { apply as applyAdapter } from '@universal-middleware/hono'
import { serve as honoServe } from '@hono/node-server'
import { installServerHMR, onReady, type ServerOptions } from '../../../serve.js'

type HonoServeOptions = Parameters<typeof honoServe>[0]
export function serve<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  options: ServerOptions & Omit<HonoServeOptions, 'fetch' | 'port'>
) {
  const serverOptions = options.serverOptions ?? {}
  const isHttps = Boolean('cert' in serverOptions && serverOptions.cert)
  function _serve() {
    return honoServe(
      {
        overrideGlobalObjects: false,
        ...(options as HonoServeOptions),
        fetch: app.fetch
      },
      onReady({ isHttps, ...options })
    )
  }

  if (import.meta.hot) {
    installServerHMR(_serve)
  } else {
    _serve()
  }

  return app
}
