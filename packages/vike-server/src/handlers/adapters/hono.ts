import { apply as applyAdapter } from '@universal-middleware/hono'
import renderPageUniversal from '../universal.js'
import type { VikeOptions } from '../../runtime/types.js'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'
import { serve as honoServe } from '@hono/node-server'
import { type ApplyReturn, bunServe, denoServe, onReady, type Serve } from '../serve.js'

function createServerAdapter<App extends Parameters<typeof applyAdapter>[0]>(app: App): Serve<App> {
  return function serve(options) {
    switch (__VIKE_RUNTIME__) {
      case 'edge-light':
        // TODO ensure this error is also triggered at build time
        throw new Error('Please install `vike-vercel` to be able to deploy to Vercel Edge. See https://vike.dev/vercel')
      case 'workerd':
        // TODO ensure this error is also triggered at build time
        throw new Error(
          'Please install `vike-cloudflare` to be able to deploy to Cloudflare. See https://vike.dev/cloudflare-pages'
        )
      case 'deno':
        denoServe(options, app.fetch)
        break
      case 'bun':
        bunServe(options, app.fetch)
        break
      case 'node':
        honoServe(
          {
            fetch: app.fetch,
            port: options.port
          },
          onReady(options)
        )
        break
      default:
      // Nothing to do
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
