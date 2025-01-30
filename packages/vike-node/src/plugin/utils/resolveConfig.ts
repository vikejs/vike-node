export { resolveConfig }

import type { ConfigVikeNode, ConfigVikeNodeResolved, EntryResolved } from '../../types.js'
import { assertUsage } from '../../utils/assert.js'
import { RUNTIMES } from '../constants.js'
import { unique } from './unique.js'

export const nativeDependecies = ['sharp', '@prisma/client', '@node-rs/*']

function resolveConfig(configVike: ConfigVikeNode): ConfigVikeNodeResolved {
  if (typeof configVike.server === 'object') {
    if (configVike.server.entry) {
      assertUsage(
        typeof configVike.server.entry === 'string' ||
          (typeof configVike.server.entry === 'object' &&
            Object.entries(configVike.server.entry).every(
              ([, value]) =>
                typeof value === 'string' || (typeof value === 'object' && 'entry' in value && 'runtime' in value)
            )),
        'server.entry should be a string or an entry mapping { name: string | { entry: string, runtime: Runtime } }'
      )
      assertUsage(
        typeof configVike.server.entry !== 'object' ||
          Object.entries(configVike.server.entry).some(([name]) => name === 'index'),
        'missing index entry in server.entry'
      )
    }

    const entriesProvided: EntryResolved =
      typeof configVike.server.entry === 'string'
        ? { index: { entry: configVike.server.entry, runtime: 'node' } }
        : Object.entries(configVike.server.entry).reduce((acc, [name, value]) => {
            if (typeof value === 'object') {
              assertUsage(
                RUNTIMES.includes(value.runtime),
                `Invalid runtime "${value.runtime}" for entry "${name}". Valid runtimes are: ${RUNTIMES.join(', ')}.`
              )
            }
            acc[name] = typeof value === 'string' ? { entry: value, runtime: 'node' } : value
            return acc
          }, {} as EntryResolved)

    assertUsage('index' in entriesProvided, 'Missing index entry in server.entry')
    return {
      server: {
        entry: entriesProvided,
        standalone: configVike.server.standalone ?? false,
        standaloneEsbuildOptions : configVike.server.standaloneEsbuildOptions ?? {},
        external: unique([...nativeDependecies, ...(configVike.server.external ?? [])])
      }
    }
  }

  assertUsage(typeof configVike.server === 'string', 'config.server should be defined')
  return {
    server: {
      entry: { index: { entry: configVike.server, runtime: 'node' } },
      standalone: false,
      standaloneEsbuildOptions: {},
      external: nativeDependecies
    }
  }
}
