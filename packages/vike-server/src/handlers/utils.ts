import type { UniversalMiddleware } from '@universal-middleware/core'
import { getGlobalContextAsync } from 'vike/server'

export async function getUniversalMiddlewares() {
  const isProduction = process.env.NODE_ENV === 'production'
  const globalContext = await getGlobalContextAsync(isProduction)
  return (globalContext.config.middleware?.flat(Number.POSITIVE_INFINITY) ?? []) as UniversalMiddleware[]
}
