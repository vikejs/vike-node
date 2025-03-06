import { apply as applyAdapter } from '@universal-middleware/hattip'
import renderPageUniversal from '../universal.js'
import type { VikeOptions } from '../../runtime/types.js'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'
import { createServer } from '@hattip/adapter-node'
import { type ApplyReturn, commonRuntimes, onReady, type Serve } from '../serve.js'

function createServerAdapter<App extends Parameters<typeof applyAdapter>[0]>(app: App): Serve<App> {
  return function serve(options) {
    if (__VIKE_RUNTIME__ === 'node') {
      createServer(app).listen(options.port, onReady(options))
    } else {
      commonRuntimes(options, app.fetch)
    }

    return app
  }
}

export function apply<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  options?: VikeOptions<'hattip'>
): ApplyReturn<App> {
  applyAdapter(app, renderPageUniversal(options))

  return {
    serve: createServerAdapter<App>(app)
  }
}

export type RuntimeAdapter = RuntimeAdapterTarget<'hattip'>
