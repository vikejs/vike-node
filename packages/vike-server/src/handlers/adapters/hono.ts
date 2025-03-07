import { apply as applyAdapter } from '@universal-middleware/hono'
import renderPageUniversal from '../universal.js'
import type { VikeOptions } from '../../runtime/types.js'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'
import { type ApplyReturnAsync, commonRuntimes, onReady, type ServerOptions } from '../serve.js'

function createServerAdapter<App extends Parameters<typeof applyAdapter>[0]>(app: App) {
  return function serve(options: ServerOptions) {
    if (process.env.VIKE_RUNTIME === 'node') {
      // @hono/node-server has side-effects. Using a dynamic import allows esbuild and rollup to perform
      // better tree-shaking
      return import('@hono/node-server').then(({ serve: honoServe }) => {
        honoServe(
          {
            fetch: app.fetch,
            port: options.port,
            overrideGlobalObjects: false
          },
          onReady(options)
        )
        return app
      })
      // biome-ignore lint/style/noUselessElse: <explanation>
    } else {
      commonRuntimes(options, app.fetch)
    }

    // TODO in vike-cloudflare -> Detect that entry has an export default

    return app
  }
}

export function apply<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  options?: VikeOptions<'hono'>
): ApplyReturnAsync<App> {
  applyAdapter(app, renderPageUniversal(options))

  return {
    serve: createServerAdapter<App>(app)
  }
}

export type RuntimeAdapter = RuntimeAdapterTarget<'hono'>
