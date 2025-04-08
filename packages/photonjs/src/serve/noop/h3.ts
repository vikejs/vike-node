import type { apply as applyAdapter } from '@universal-middleware/h3'
import type { ServerOptions } from '../utils.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, _options: ServerOptions) {
  return app
}
