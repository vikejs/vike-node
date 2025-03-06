import { apply as applyAdapter } from '@universal-middleware/fastify'
import renderPageUniversal from '../universal.js'
import type { VikeOptions } from '../../runtime/types.js'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'
import { type ApplyReturn, commonRuntimesNode, onReady, type Serve } from '../serve.js'

function createServerAdapter<App extends Parameters<typeof applyAdapter>[0]>(app: App): Serve<App> {
  return function serve(options) {
    if (__VIKE_RUNTIME__ === 'node') {
      app.listen(
        {
          port: options.port
        },
        onReady(options)
      )
    } else {
      commonRuntimesNode('Fastify')
    }

    return app
  }
}

export async function apply<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  options?: VikeOptions<'fastify'>
): Promise<ApplyReturn<App>> {
  await applyAdapter(app, renderPageUniversal(options))

  return {
    serve: createServerAdapter<App>(app)
  }
}

export type RuntimeAdapter = RuntimeAdapterTarget<'fastify'>
