export { vike }

import { EventHandlerRequest, H3Event, toWebRequest } from 'h3'
import { connectToWeb } from '../adapters/connectToWeb.js'
import { globalStore } from '../globalStore.js'
import { createHandler } from '../handler.js'
import type { VikeOptions } from '../types.js'

/**
 * Creates a H3 middleware to handle Vike requests and HMR (Hot Module Replacement).
 *
 * @param {VikeOptions} [options] - Configuration options for Vike.
 *
 * @returns {MiddlewareHandler} A H3 middleware function that processes requests with Vike.
 *
 * @description
 * This function creates a H3 middleware that integrates Vike's server-side rendering capabilities
 * and handles Hot Module Replacement (HMR) for development environments. The middleware:
 *
 * 1. Checks for and handles HMR WebSocket upgrade requests.
 * 2. Processes regular requests using Vike's handler.
 * 3. Adapts Node.js-style request handling to work with Web standard Response objects.
 */
function vike(options?: VikeOptions<Request>) {
    const handler = createHandler(options);

    return async function middleware(event: H3Event<EventHandlerRequest>) {
        const request = toWebRequest(event);

        globalStore.setupHMRProxy(event.node.req);

        const response = await connectToWeb((req, res, next) =>
            handler({
                req,
                res,
                next,
                platformRequest: request
            })
        )(request)

        if (response) {
            return response
        }
    }
}
