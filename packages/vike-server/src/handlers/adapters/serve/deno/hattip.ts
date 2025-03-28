import type { apply as applyAdapter } from '@universal-middleware/hattip'
import { denoServe, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  const handler = app.buildHandler()
  denoServe(options, (request) => {
    return handler({
      request,
      ip: '',
      passThrough() {
        // No op
      },
      waitUntil() {
        // No op
      },
      platform: { name: 'bun' },
      env(variable: string) {
        return process.env[variable]
      }
    })
  })

  return handler
}
