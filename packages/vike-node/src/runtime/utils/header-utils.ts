export { flattenHeaders, parseHeaders }

import type { OutgoingHttpHeaders } from 'node:http'
import type { HeadersProvided } from '../types.js'

function flattenHeaders(headers: OutgoingHttpHeaders): [string, string][] {
  const flatHeaders: [string, string][] = []

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) {
      continue
    }

    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v != null) {
          flatHeaders.push([key, String(v)])
        }
      })
    } else {
      flatHeaders.push([key, String(value)])
    }
  }

  return flatHeaders
}

function parseHeaders(headers: HeadersProvided): [string, string][] {
  const result: [string, string][] = []
  if (typeof headers.forEach === 'function') {
    headers.forEach((value, key) => {
      if (Array.isArray(value)) {
        value.forEach((value_) => {
          result.push([key, value_])
        })
      } else {
        result.push([key, value])
      }
    })
  } else {
    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        value.forEach((value_) => {
          result.push([key, value_])
        })
      } else {
        result.push([key, value])
      }
    }
  }

  return result
}
