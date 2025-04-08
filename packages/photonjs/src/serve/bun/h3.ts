import type { apply as applyAdapter } from '@universal-middleware/h3'
import { bunServe, type ServerOptions } from '../utils.js'
import { toWebHandler } from 'h3'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  bunServe(options, toWebHandler(app))

  return app
}
