export { createServerResponse }

import { ServerResponse, type IncomingMessage, type OutgoingHttpHeader, type OutgoingHttpHeaders } from 'http'
import { PassThrough, Readable } from 'stream'

/**
 * Creates a custom ServerResponse object that allows for intercepting and streaming the response.
 *
 * @param {IncomingMessage} incomingMessage - The incoming HTTP request message.
 * @returns {{ res: ServerResponse; onReadable: Promise<{ readable: Readable; headers: OutgoingHttpHeaders; statusCode: number }> }}
 * An object containing:
 *   - res: The custom ServerResponse object.
 *   - onReadable: A promise that resolves when the response is readable, providing the readable stream, headers, and status code.
 */
function createServerResponse(incomingMessage: IncomingMessage) {
  const res = new ServerResponse(incomingMessage)
  const passThrough = new PassThrough()
  const onReadable = new Promise<{ readable: Readable; headers: OutgoingHttpHeaders; statusCode: number }>(
    (resolve, reject) => {
      const handleReadable = () => {
        resolve({ readable: Readable.from(passThrough), headers: res.getHeaders(), statusCode: res.statusCode })
      }

      const handleError = (err: Error) => {
        reject(err)
      }

      passThrough.once('readable', handleReadable)
      passThrough.once('end', handleReadable)
      passThrough.once('error', handleError)
      res.once('error', handleError)
    }
  )

  passThrough.once('finish', () => {
    setTimeout(() => {
      res.emit('finish')
    }, 0)
  })
  passThrough.once('close', () => {
    setTimeout(() => {
      res.emit('close')
    }, 0)
  })
  passThrough.on('drain', () => {
    res.emit('drain')
  })

  res.write = passThrough.write.bind(passThrough)
  res.end = (passThrough as any).end.bind(passThrough)

  res.writeHead = function writeHead(
    statusCode: number,
    statusMessage?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
    headers?: OutgoingHttpHeaders | OutgoingHttpHeader[]
  ): ServerResponse {
    res.statusCode = statusCode
    if (typeof statusMessage === 'object') {
      headers = statusMessage
      statusMessage = undefined
    }
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        if (value !== undefined) {
          res.setHeader(key, value)
        }
      })
    }
    return res
  }

  return {
    res,
    onReadable
  }
}
