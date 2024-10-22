export { createServerResponse }

import type { OutgoingHttpHeader, OutgoingHttpHeaders } from 'node:http'
import { PassThrough, Readable } from 'node:stream'
import type { HttpResponse } from 'uWebSockets.js'

type OnReadable = (cb: (result: {
  readable: Readable
  headers: [string, string][]
  statusCode: number
}) => void) => void

type CreatedServerReponse = {
  res: HttpResponse
  onReadable: OnReadable
}

/**
 * Creates a custom ServerResponse object that allows for intercepting and streaming the response.
 *
 * @param {HttpResponse} res - The incoming HTTP request message.
 * @returns {CreatedServerReponse}
 * An object containing:
 *   - res: The custom ServerResponse object.
 *   - onReadable: A function that takes a callback. The callback is invoked when the response is readable,
 *     providing an object with the readable stream, headers, and status code.
 */
function createServerResponse(res: HttpResponse): CreatedServerReponse {
  const passThrough = new PassThrough()
  let handled = false

  const onReadable: OnReadable = (cb) => {
    const handleReadable = () => {
      if (handled) return
      handled = true
      cb({
        readable: Readable.from(passThrough),
        headers: res.headers as [string, string][],
        statusCode: res.statusCode as number
      })
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
  res.end = (passThrough as any).end.bind(passThrough)

  res.writeHead = function writeHead(
    statusCode: number,
    statusMessage?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
    headers?: OutgoingHttpHeaders | OutgoingHttpHeader[]
  ): void {
    res.writeStatus(statusCode + '')
    if (typeof statusMessage === 'object') {
      headers = statusMessage
      statusMessage = undefined
    }
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        if (value !== undefined) {
          res.writeHeader(key, value.toString())
        }
      })
    }
  }

  return {
    res,
    onReadable
  }
}
