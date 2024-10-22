export { writeHttpResponse, writeHttpResponseUws, readableStreamToBuffer }

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

  for (const [key, value] of httpResponse.headers) {
    res.writeHeader(key!, value!)
  }

  const readableWebStream = httpResponse.getReadableWebStream()

  res.end(await readableStreamToBuffer(readableWebStream))
}

/**
 * Convert Readable Web Stream to Buffer
 */
async function readableStreamToBuffer(readableStream: ReadableStream): Promise<Buffer> {
  const reader = readableStream.getReader()
  const chunks: Uint8Array[] = []

  let result = await reader.read()
  while (!result.done) {
    chunks.push(result.value)
    result = await reader.read()
  }

  // Using Buffer.concat directly to handle chunk concatenation, improving performance.
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
}
