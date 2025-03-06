import { apply as applyAdapter } from '@universal-middleware/elysia'
import renderPageUniversal from '../universal.js'
import type { VikeOptions } from '../../runtime/types.js'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'
import { type ApplyReturn, denoServe, edgeRuntimes, onReady, type Serve } from '../serve.js'
import { type AnyElysia, Elysia } from 'elysia'
import { node } from '@elysiajs/node'

function createServerAdapter(app: Parameters<typeof applyAdapter>[0]): Serve<AnyElysia> {
  return function serve(options) {
    if (__VIKE_RUNTIME__ === 'node') {
      return new Elysia({ adapter: node() }).mount(app).listen(options.port, onReady(options))
    } else {
      edgeRuntimes()
      switch (__VIKE_RUNTIME__) {
        case 'deno':
          denoServe(options, app.fetch)
          break
        case 'bun':
          return app.listen(options.port, onReady(options))
      }
    }

    return app
  }
}

export function apply(
  app: Parameters<typeof applyAdapter>[0],
  options?: VikeOptions<'elysia'>
): ApplyReturn<AnyElysia> {
  applyAdapter(app, renderPageUniversal(options))

  return {
    serve: createServerAdapter(app)
  }
}

export type RuntimeAdapter = RuntimeAdapterTarget<'elysia'>
