import type { apply as applyAdapter } from '@universal-middleware/hono'
import { serve as honoServe } from '@hono/node-server'
import { getPort, installServerHMR, onReady } from '../utils.js'
import type { MergedHonoServerOptions } from '../noop/hono-types.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: MergedHonoServerOptions) {
  const serverOptions = options.serverOptions ?? {}
  const isHttps = Boolean('cert' in serverOptions && serverOptions.cert)
  function _serve() {
    const port = getPort(options)
    const server = honoServe(
      {
        overrideGlobalObjects: options?.overrideGlobalObjects ?? false,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        ...(options as any),
        port,
        fetch: app.fetch
      },
      onReady({ isHttps, ...options, port })
    )
    // onCreate hook
    options.onCreate?.(server)
    return server
  }

  if (import.meta.hot) {
    installServerHMR(_serve)
  } else {
    _serve()
  }

  return app
}
