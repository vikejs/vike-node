export { vike }

import { eventHandler, EventHandler } from 'h3'
import type { IncomingMessage } from 'node:http'
import { globalStore } from '../globalStore.js'
import { createHandler } from '../handler.js'
import type { VikeOptions } from '../types.js'

/**
 * Creates an h3 event handler to process Vike requests.
 *
 * @param {VikeOptions<IncomingMessage>} [options] - Configuration options for Vike.
 *
 * @returns {EventHandler} An h3 event handler that processes requests with Vike.
 *
 * @description
 * This function creates an h3 event handler that integrates Vike's server-side rendering capabilities.
 * The handler:
 * 1. Checks for and handles HMR WebSocket upgrade requests.
 * 2. Processes regular requests using Vike's handler.
 *
 * @example
 * ```js
 * import { createServer } from 'http'
 * import { createApp } from 'h3'
 * import { vike } from 'vike-node/h3'
 *
 * const app = createApp()
 * app.use(vike())
 *
 * createServer(app).listen(3000)
 * ```
 *
 * @remarks
 * - This handler directly uses Node.js' IncomingMessage and ServerResponse objects from the h3 event.
 * - Error handling should be implemented at the h3 app level.
 *
 */
function vike(options?: VikeOptions<IncomingMessage>): EventHandler {
  const handler = createHandler(options)
  return eventHandler(async (event) => {
    const {
      node: { req, res }
    } = event

    globalStore.setupHMRProxy(req)
    await handler({
      req,
      res,
      platformRequest: req
    })
  })
}
