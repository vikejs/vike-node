import type { apply as applyAdapter } from '@universal-middleware/hono'
import { serve as honoServe } from '@hono/node-server'
import { installServerHMR, onReady, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  function _serve() {
    return honoServe(
      {
        fetch: app.fetch,
        port: options.port,
        overrideGlobalObjects: false
      },
      onReady(options)
    )
  }

  if (import.meta.hot) {
    const previousServerClosing: Promise<void> = import.meta.hot.data.previousServerClosing ?? Promise.resolve()

    previousServerClosing.then(() => {
      const server = _serve()
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      import.meta.hot!.data.previousServerClosing = installServerHMR(server)
    })
  } else {
    _serve()
  }

  return app
}
