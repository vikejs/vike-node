import { apply as applyAdapter } from '@universal-middleware/hono'
import renderPageUniversal from '../universal.js'
import type { VikeOptions } from '../../runtime/types.js'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'
import { serve as honoServe } from '@hono/node-server'
import { type ApplyReturn, commonRuntimes, onReady, type Serve } from '../serve.js'

function createServerAdapter<App extends Parameters<typeof applyAdapter>[0]>(app: App): Serve<App> {
  return function serve(options) {
    if (__VIKE_RUNTIME__ === 'node') {
      honoServe(
        {
          fetch: app.fetch,
          port: options.port
        },
        onReady(options)
      )
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
): ApplyReturn<App> {
  applyAdapter(app, renderPageUniversal(options))

  return {
    serve: createServerAdapter<App>(app)
  }
}

export type RuntimeAdapter = RuntimeAdapterTarget<'hono'>
