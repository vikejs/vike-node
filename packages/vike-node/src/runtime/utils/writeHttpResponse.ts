export { writeHttpResponse, writeHttpResponseUws }

import type { HttpResponse } from 'uWebSockets.js'
import type { ServerResponse } from 'http'
import { assert } from '../../utils/assert.js'
import type { VikeHttpResponse } from '../types.js'
import { groupHeaders } from './header-utils.js'

async function writeHttpResponse(httpResponse: VikeHttpResponse, res: ServerResponse) {
  assert(httpResponse)
  const { statusCode, headers } = httpResponse
  const groupedHeaders = groupHeaders(headers)
  groupedHeaders.forEach(([name, value]) => res.setHeader(name, value))
  res.statusCode = statusCode
  httpResponse.pipe(res)
  await new Promise<void>((resolve) => {
    res.once('close', resolve)
  })
}

async function writeHttpResponseUws(httpResponse: VikeHttpResponse, res: HttpResponse) {
  assert(httpResponse)
  res.writeStatus(httpResponse.statusCode + '')

  for (const header in httpResponse.headers) {
    res.writeHeader(header[0]!, header[1]!)
  }

  const readableWebStream = httpResponse.getReadableWebStream()

  res.end(await readableStreamToArrayBuffer(readableWebStream))
}

/**
 * Convert Readable Web Stream to ArrayBuffer
 */
async function readableStreamToArrayBuffer(readableStream: ReadableStream): Promise<Uint8Array> {
  const reader = readableStream.getReader()
  const chunks: Uint8Array[] = []
  let done = false
  while (!done) {
    const { value, done: doneReading } = await reader.read()
    if (value) {
      chunks.push(value)
    }
    done = doneReading
  }

  const arrayBuffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    arrayBuffer.set(chunk, offset)
    offset += chunk.length
  }

  return arrayBuffer
}
