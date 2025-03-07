export { resolveConfig }

import type { ConfigVikeNode, ConfigVikeNodeResolved } from '../../types.js'
import { assertUsage } from '../../utils/assert.js'
import { unique } from './unique.js'

export const nativeDependecies = ['sharp', '@prisma/client', '@node-rs/*']

function resolveConfig(configVike: ConfigVikeNode): ConfigVikeNodeResolved {
  if (typeof configVike.server === 'object') {
    if (configVike.server.entry) {
      assertUsage(
        typeof configVike.server.entry === 'string' ||
          (typeof configVike.server.entry === 'object' &&
            Object.entries(configVike.server.entry).every(([, value]) => typeof value === 'string')),
        'server.entry should be a string or an entry mapping { index: string; [name: string]: string }'
      )
      assertUsage(
        typeof configVike.server.entry !== 'object' ||
          Object.entries(configVike.server.entry).some(([name]) => name === 'index'),
        'missing index entry in server.entry'
      )
    }

    const entriesProvided: Record<string, string> =
      typeof configVike.server.entry === 'string' ? { index: configVike.server.entry } : configVike.server.entry

    assertUsage('index' in entriesProvided, 'Missing index entry in server.entry')
    return {
      server: {
        entry: entriesProvided,
        runtime: configVike.server.runtime ?? 'node',
        standalone: configVike.server.standalone ?? false,
        external: unique([...nativeDependecies, ...(configVike.server.external ?? [])])
      }
    }
  }

  assertUsage(typeof configVike.server === 'string', 'config.server should be defined')
  return {
    server: {
      entry: { index: configVike.server },
      runtime: 'node',
      standalone: false,
      external: nativeDependecies
    }
  }
}
