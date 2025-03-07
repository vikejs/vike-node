import type { apply as applyAdapter } from '@universal-middleware/hattip'
import type { ServerOptions } from '../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, _options: ServerOptions) {
  return app
}
