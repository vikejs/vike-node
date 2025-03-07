export { createServerResponse }

import { type IncomingMessage, type OutgoingHttpHeader, type OutgoingHttpHeaders, ServerResponse } from 'node:http'
import { PassThrough, Readable } from 'node:stream'

/**
 * Creates a custom ServerResponse object that allows for intercepting and streaming the response.
 *
 * @param {IncomingMessage} incomingMessage - The incoming HTTP request message.
 * @returns {{
 *   res: ServerResponse;
 *   onReadable: (cb: (result: { readable: Readable; headers: OutgoingHttpHeaders; statusCode: number }) => void) => void
 * }}
 * An object containing:
 *   - res: The custom ServerResponse object.
 *   - onReadable: A function that takes a callback. The callback is invoked when the response is readable,
 *     providing an object with the readable stream, headers, and status code.
 */
function createServerResponse(incomingMessage: IncomingMessage) {
  const res = new ServerResponse(incomingMessage)
  const passThrough = new PassThrough()
  let handled = false

  const onReadable = (
    cb: (result: { readable: Readable; headers: OutgoingHttpHeaders; statusCode: number }) => void
  ) => {
    const handleReadable = () => {
      if (handled) return
      handled = true
      cb({ readable: Readable.from(passThrough), headers: res.getHeaders(), statusCode: res.statusCode })
    }

    passThrough.once('readable', handleReadable)
    passThrough.once('end', handleReadable)
  }

  passThrough.once('finish', () => {
    res.emit('finish')
  })
  passThrough.once('close', () => {
    res.destroy()
    res.emit('close')
  })
  passThrough.on('drain', () => {
    res.emit('drain')
  })

  res.write = passThrough.write.bind(passThrough)
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  res.end = passThrough.end.bind(passThrough) as any

  res.writeHead = function writeHead(
    statusCode: number,
    statusMessage?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
    headers?: OutgoingHttpHeaders | OutgoingHttpHeader[]
  ): ServerResponse {
    res.statusCode = statusCode
    if (typeof statusMessage === 'object') {
      // biome-ignore lint/style/noParameterAssign: <explanation>
      headers = statusMessage
      // biome-ignore lint/style/noParameterAssign: <explanation>
      statusMessage = undefined
    }
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        if (value !== undefined) {
          res.setHeader(key, value)
        }
      }
    }
    return res
  }

  return {
    res,
    onReadable
  }
}
