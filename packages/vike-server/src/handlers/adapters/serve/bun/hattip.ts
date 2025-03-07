import type { apply as applyAdapter } from '@universal-middleware/hattip'
import { bunServe, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  bunServe(options, app.fetch)

  return app
}
