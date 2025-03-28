import type { apply as applyAdapter } from '@universal-middleware/fastify'
import type { ServerOptionsBase } from '../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, _options: ServerOptionsBase) {
  return app
}
