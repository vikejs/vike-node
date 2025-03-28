import type { apply as applyAdapter } from '@universal-middleware/hono'
import { serve as honoServe } from '@hono/node-server'
import { type Callback, installServerHMR, onReady } from '../../../serve.js'
import type { HonoServerOptions, MergedHonoServerOptions } from '../hono-types.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  options: MergedHonoServerOptions,
  callback?: Callback
) {
  const serverOptions = options.serverOptions ?? {}
  const isHttps = Boolean('cert' in serverOptions && serverOptions.cert)
  function _serve() {
    return honoServe(
      {
        overrideGlobalObjects: false,
        ...(options as HonoServerOptions),
        fetch: app.fetch
      },
      onReady({ isHttps, callback, ...options })
    )
  }

  if (import.meta.hot) {
    installServerHMR(_serve)
  } else {
    _serve()
  }

  return app
}
