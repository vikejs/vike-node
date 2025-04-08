import type { UniversalMiddleware } from '@universal-middleware/core'
import { getGlobalContext } from 'vike/server'

export async function getUniversalMiddlewares() {
  const globalContext = await getGlobalContext()
  return (globalContext.config.middleware?.flat(Number.POSITIVE_INFINITY) ?? []) as UniversalMiddleware[]
}
