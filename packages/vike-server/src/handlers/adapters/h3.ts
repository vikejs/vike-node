import { apply as applyAdapter } from '@universal-middleware/h3'
import renderPageUniversal from '../universal.js'
import type { VikeOptions } from '../../runtime/types.js'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'
import { type ApplyReturn, commonRuntimes, onReady, type Serve } from '../serve.js'
import { createServer } from 'node:http'
import { toNodeListener, toWebHandler } from 'h3'

function createServerAdapter<App extends Parameters<typeof applyAdapter>[0]>(app: App): Serve<App> {
  return function serve(options) {
    if (__VIKE_RUNTIME__ === 'node') {
      createServer(toNodeListener(app)).listen(options.port, onReady(options))
    } else {
      commonRuntimes(options, toWebHandler(app))
    }

    return app
  }
}

export function apply<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  options?: VikeOptions<'h3'>
): ApplyReturn<App> {
  applyAdapter(app, renderPageUniversal(options))

  return {
    serve: createServerAdapter<App>(app)
  }
}

export type RuntimeAdapter = RuntimeAdapterTarget<'h3'>
