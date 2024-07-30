export { vike }

import { Elysia, NotFoundError } from 'elysia'
import { connectToWeb } from '../adapters/connectToWeb.js'
import { createHandler } from '../handler.js'
import type { VikeOptions } from '../types.js'

/**
 * Creates an Elysia plugin to handle Vike requests.
 *
 * @param {VikeOptions<Request>} [options] - Configuration options for Vike.
 *
 * @returns {Elysia} An Elysia plugin that handles all GET requests and processes them with Vike.
 *
 * @description
 * The plugin:
 * 1. Sets up a catch-all GET route handler that processes requests using Vike's handler.
 * 2. Throws a NotFoundError if Vike doesn't handle the request, allowing Elysia to manage 404 responses.
 *
 * @example
 * ```js
 * import { Elysia } from 'elysia'
 * import { vike } from 'vike-node/elysia'
 *
 * const app = new Elysia()
 * app.use(vike())
 * app.listen(3000)
 * ```
 *
 * @throws {NotFoundError} Thrown when Vike doesn't handle the request, allowing Elysia to manage 404 responses.
 */
function vike(options?: VikeOptions<Request>): Elysia {
  const handler = createHandler(options)
  return new Elysia({
    name: 'vike-node:elysia'
  }).get('*', async (ctx) => {
    const response = await connectToWeb((req, res, next) =>
      handler({
        req,
        res,
        next,
        platformRequest: ctx.request
      })
    )(ctx.request)

    if (response) {
      return response
    }

    throw new NotFoundError()
  })
}
