import compressMiddlewareFactory from '@universal-middleware/compress'
import { isVercel } from '../utils/isVercel.js'
import { globalStore } from '../runtime/globalStore.js'
import type { VikeOptions } from '../runtime/types.js'
import type { Get, UniversalMiddleware } from '@universal-middleware/core'

export const compressMiddleware = ((options?) => async (request, _context) => {
  const compressionType = options?.compress ?? !isVercel()
  const compressMiddlewareInternal = compressMiddlewareFactory()(request)

  return async (response) => {
    if (!globalStore.isDev) {
      const isAsset = new URL(request.url).pathname.startsWith('/assets/')
      const shouldCompressResponse = compressionType === true || (compressionType === 'static' && isAsset)
      if (shouldCompressResponse) {
        return compressMiddlewareInternal(response)
      }
    }
    return response
  }
}) satisfies Get<[options: VikeOptions], UniversalMiddleware>
