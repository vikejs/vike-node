import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isVercel } from '../../utils/isVercel.js'
import type { VikeOptions } from '../types.js'

export function resolveStaticConfig(static_: VikeOptions['static']): false | { root: string; cache: boolean } {
  // Disable static file serving for Vercel
  // Vercel will serve static files on its own
  // See vercel.json > outputDirectory
  if (isVercel()) return false
  if (static_ === false) return false

  const argv1 = process.argv[1]
  const entrypointDirAbs = argv1
    ? dirname(isAbsolute(argv1) ? argv1 : join(process.cwd(), argv1))
    : dirname(fileURLToPath(import.meta.url))
  const defaultStaticDir = join(entrypointDirAbs, '..', 'client')

  if (static_ === true || static_ === undefined) {
    return { root: defaultStaticDir, cache: true }
  }
  if (typeof static_ === 'string') {
    return { root: static_, cache: true }
  }
  return {
    root: static_.root ?? defaultStaticDir,
    cache: static_.cache ?? true
  }
}
