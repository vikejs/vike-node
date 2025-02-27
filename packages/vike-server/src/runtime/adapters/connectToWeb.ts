export { connectToWeb }

import type { IncomingMessage, OutgoingHttpHeaders } from 'node:http'
import type { ConnectMiddleware, ConnectMiddlewareBoolean, WebHandler } from '../types.js'
import { Readable } from 'node:stream'
import { DUMMY_BASE_URL } from '../constants.js'
import { createServerResponse } from './createServerResponse.js'

const statusCodesWithoutBody = [
  100, // Continue
  101, // Switching Protocols
  102, // Processing (WebDAV)
  103, // Early Hints
  204, // No Content
  205, // Reset Content
  304 // Not Modified
]

// TODO move to universal-middleware?
/**
 * Converts a Connect-style middleware to a web-compatible request handler.
 *
 * @param {ConnectMiddleware | ConnectMiddlewareBoolean} handler - The Connect-style middleware function to be converted.
 * @returns {WebHandler} A function that handles web requests and returns a Response or undefined.
 */
function connectToWeb(handler: ConnectMiddleware | ConnectMiddlewareBoolean): WebHandler {
  return async (request: Request, _context, runtime): Promise<Response | undefined> => {
    const req = runtime && 'req' in runtime && runtime.req ? runtime.req : createIncomingMessage(request)
    const { res, onReadable } = createServerResponse(req)

    // biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
    return new Promise<Response | undefined>(async (resolve, reject) => {
      onReadable(({ readable, headers, statusCode }) => {
        const responseBody = statusCodesWithoutBody.includes(statusCode)
          ? null
          : (Readable.toWeb(readable) as ReadableStream)
        resolve(
          new Response(responseBody, {
            status: statusCode,
            headers: flattenHeaders(headers)
          })
        )
      })

      const next = (error?: unknown) => {
        if (error) {
          reject(error instanceof Error ? error : new Error(String(error)))
        } else {
          resolve(undefined)
        }
      }

      try {
        const handled = await handler(req, res, next)

        if (handled === false) {
          res.destroy()
          resolve(undefined)
        }
      } catch (e) {
        next(e)
      }
    })
  }
}

/**
 * Creates an IncomingMessage object from a web Request.
 *
 * @param {Request} request - The web Request object.
 * @returns {IncomingMessage} An IncomingMessage-like object compatible with Node.js HTTP module.
 */
function createIncomingMessage(request: Request): IncomingMessage {
  const parsedUrl = new URL(request.url, DUMMY_BASE_URL)
  const pathnameAndQuery = (parsedUrl.pathname || '') + (parsedUrl.search || '')
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const body = request.body ? Readable.fromWeb(request.body as any) : Readable.from([])

  return Object.assign(body, {
    url: pathnameAndQuery,
    method: request.method,
    headers: Object.fromEntries(request.headers)
  }) as IncomingMessage
}

function flattenHeaders(headers: OutgoingHttpHeaders): [string, string][] {
  const flatHeaders: [string, string][] = []

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) {
      continue
    }

    if (Array.isArray(value)) {
      for (const v of value) {
        if (v != null) {
          flatHeaders.push([key, String(v)])
        }
      }
    } else {
      flatHeaders.push([key, String(value)])
    }
  }

  return flatHeaders
}
