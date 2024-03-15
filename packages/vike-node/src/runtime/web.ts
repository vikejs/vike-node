export { vike }

import { PassThrough, Readable } from 'stream'
import { createHandler } from './handler.js'
import type { HeadersProvided, VikeOptions } from './types.js'
import { convertToHttpHeaders, parseHeaders } from './renderAsset.js'

function vike(
  {
    url,
    headers
  }: {
    url: string
    headers: HeadersProvided
  },
  options?: VikeOptions
) {
  const requestHeaders = convertToHttpHeaders(parseHeaders(headers))
  const handler = createHandler(options)
  const responseHeaders: Record<string, string> = {}
  let responseStatus = 200
  const res = new Proxy(new PassThrough(), {
    get(target, prop) {
      if (prop === 'headers') {
        return responseHeaders
      }
      if (prop === 'statusCode') {
        return responseStatus
      }
      return Reflect.get(target, prop)
    }
  })
  // @ts-ignore
  res.setHeader = (key: string, value: string) => {
    responseHeaders[key] = value
  }
  // @ts-ignore
  res.getHeader = (key: string) => responseHeaders[key]
  // @ts-ignore
  res.removeHeader = (key: string) => delete responseHeaders[key]
  // @ts-ignore
  res.writeHead = (status_: number, headersOrMessage?: Record<string, string> | string) => {
    responseStatus = status_
    if (typeof headersOrMessage === 'object') {
      Object.assign(responseHeaders, headersOrMessage)
    }
  }

  return new Promise<{ stream: ReadableStream; status: number; headers: Record<string, string> } | null>((resolve) => {
    function resolveResponse() {
      const readableStream = Readable.toWeb(res) as ReadableStream
      resolve({
        stream: readableStream,
        status: responseStatus,
        headers: responseHeaders
      })
    }

    const originalPipe = res.pipe.bind(res)
    res.pipe = (...args) => {
      resolveResponse()
      return originalPipe(...args)
    }
    const originalEnd = res.end.bind(res)
    res.end = (...args) => {
      resolveResponse()
      // @ts-ignore
      return originalEnd(...args)
    }
    // @ts-ignore
    res._header = () => {}

    const req = {
      url,
      headers: requestHeaders,
      method: 'GET',
      getHeader: (key: string) => requestHeaders[key],
      headersSent: false
    }

    handler({
      // @ts-ignore
      req,
      // @ts-ignore
      res,
      platformRequest: null,
      next: () => {
        resolve(null)
      }
    })
  })
}
