export { vike }

import type { TemplatedApp, HttpRequest } from 'uWebSockets.js'
import { createHandler } from '../handler-web-and-node-uws.js'
import type { PlatformRequestUws, VikeOptions } from '../types.js'

/**
 * Creates an uWebSockets.js plugin to handle Vike requests.
 *
 * @param {VikeOptions} [options] - Configuration options for Vike.
 *
 * @returns {TemplatedApp} An uWebSockets.js plugin that handles all GET requests and processes them with Vike.
 *
 * @description
 * The plugin:
 * 1. Set up a catch-all GET route handler that processes requests using Vike's handler.
 * 2. Catch internal errors.
 *
 * @example
 * ```js
 * import { App } from 'uWebSockets.js'
 * import { vike } from 'vike-node/uws'
 *
 * const app = vike(App())
 * app.listen(3000)
 * ```
 */
function vike(app: TemplatedApp, options?: VikeOptions<HttpRequest>): TemplatedApp {
  const handler = createHandler(options)
  return app.get('*', (response, request) =>
    handler({ response, request, platformRequest: request as PlatformRequestUws }).catch((error: Error) => {
      console.error(error)
      response.writeStatus('500').end('Internal Server Error: ' + error.message)
    })
  )
}
