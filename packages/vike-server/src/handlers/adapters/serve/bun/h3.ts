import type { apply as applyAdapter } from '@universal-middleware/h3'
import { bunServe, type Callback, type ServerOptions } from '../../../serve.js'
import { toWebHandler } from 'h3'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(
  app: App,
  options: ServerOptions,
  callback?: Callback
) {
  bunServe(options, toWebHandler(app), callback)

  return app
}
