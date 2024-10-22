export { connectToWeb }

import { Readable } from 'node:stream'
import type { HttpResponse } from 'uWebSockets.js'
import type { ConnectMiddlewareUws, PlatformRequestUws, WebHandlerUws } from '../types.js'
import { createServerResponse } from './createServerResponseUws.js'
import { DUMMY_BASE_URL } from '../constants.js'

const statusCodesWithoutBody = new Set([
  100, // Continue
  101, // Switching Protocols
  102, // Processing (WebDAV)
  103, // Early Hints
  204, // No Content
  205, // Reset Content
  304 // Not Modified
]) as ReadonlySet<number>

/**
 * Converts a Connect-style middleware to a web-compatible request handler.
 *
 * @param {ConnectMiddlewareUws} handler - The Connect-style middleware function to be converted.
 * @returns {WebHandlerUws} A function that handles web requests and returns a Response or undefined.
 */
function connectToWeb(handler: ConnectMiddlewareUws): WebHandlerUws {
  return async (response: HttpResponse, platformRequest: PlatformRequestUws): Promise<void> => {
    const { res, onReadable } = createServerResponse(enrichResponse(response, platformRequest))

    return new Promise<void>((resolve) => {
      onReadable(({ readable, headers, statusCode }) => {
        const responseBody = statusCodesWithoutBody.has(statusCode)
          ? ''
          : (Readable.toWeb(readable) as ReadableStream)

        res.writeStatus(statusCode.toString())
        for (const [key, value] of headers) {
          res.writeHeader(key, value)
        }
        res.end(responseBody)
        resolve()
      })

      Promise.resolve(handler(res, platformRequest))
    })
  }
}

/**
 * Update the HttpResponse object from a web HttpRequest.
 *
 * @param {HttpResponse} res - The web Request object.
 * @param {PlatformRequestUws} platformRequest
 * @returns {HttpResponse} An IncomingMessage-like object compatible with Node.js HTTP module.
 */
function enrichResponse(res: HttpResponse, platformRequest: PlatformRequestUws): HttpResponse {
  const parsedUrl = new URL(platformRequest.url, DUMMY_BASE_URL)
  const pathnameAndQuery = (parsedUrl.pathname || '') + (parsedUrl.search || '')
  // (?) TODO const body = platformRequest.body ? Readable.fromWeb(platformRequest.body as any) : Readable.from([])
  res.url = pathnameAndQuery
  res.method = 'GET'
  res.headers = Object.fromEntries(platformRequest.headers)

  return res
}
