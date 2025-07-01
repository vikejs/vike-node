import type { UniversalMiddleware } from '@universal-middleware/core'
import { getGlobalContext, getGlobalContextSync } from 'vike/server'

// We use async getGlobalContext in dev (required by Vike)
export async function getUniversalMiddlewaresDev() {
  const globalContext = await getGlobalContext()
  return (globalContext.config.middleware?.flat(Number.POSITIVE_INFINITY) ?? []) as UniversalMiddleware[]
}

// In prod, we must use getGlobalContextSync, because some deployment targets
// still do not support modules with top-level await.
export function getUniversalMiddlewaresProd() {
  const globalContext = getGlobalContextSync()
  return (globalContext.config.middleware?.flat(Number.POSITIVE_INFINITY) ?? []) as UniversalMiddleware[]
}
