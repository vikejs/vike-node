import compressMiddlewareFactory from '@universal-middleware/compress'
import type { Get, UniversalMiddleware } from '@universal-middleware/core'
import { isVercel } from '../../utils/isVercel.js'
import type { VikeOptions } from '../types.js'

export const compressMiddleware = ((options?) => async (request, _context) => {
  const compressionType = options?.compress ?? !isVercel()
  const compressMiddlewareInternal = compressMiddlewareFactory()(request)

  return async (response) => {
    if (process.env.NODE_ENV !== 'development') {
      const isAsset = new URL(request.url).pathname.startsWith('/assets/')
      const shouldCompressResponse = compressionType === true || (compressionType === 'static' && isAsset)
      if (shouldCompressResponse) {
        return compressMiddlewareInternal(response)
      }
    }
    return response
  }
}) satisfies Get<[options: VikeOptions], UniversalMiddleware>
