export { resolveServerConfig }

import type { ConfigVikeServerPlugin, ConfigVikeServerResolved } from '../../types.js'
import { assertUsage } from '../../utils/assert.js'

function resolveServerConfig(configServerValue: ConfigVikeServerPlugin | undefined): ConfigVikeServerResolved {
  if (typeof configServerValue === 'object' && configServerValue !== null) {
    if ('entry' in configServerValue) {
      assertUsage(
        typeof configServerValue.entry === 'string' ||
          (typeof configServerValue.entry === 'object' &&
            Object.entries(configServerValue.entry as Record<string, unknown>).every(
              ([, value]) => typeof value === 'string'
            )),
        'server.entry should be a string or an entry mapping { index: string; [name: string]: string }'
      )
      assertUsage(
        typeof configServerValue.entry !== 'object' ||
          Object.entries(configServerValue.entry as Record<string, unknown>).some(([name]) => name === 'index'),
        'missing index entry in server.entry'
      )
    }

    const entriesProvided: { index: string; [name: string]: string } =
      typeof configServerValue.entry === 'string' ? { index: configServerValue.entry } : configServerValue.entry

    assertUsage('index' in entriesProvided, 'Missing index entry in server.entry')
    return {
      entry: entriesProvided,
      runtime: configServerValue.runtime ?? 'node',
      standalone: configServerValue.standalone ?? false,
      external: configServerValue.external ?? []
    }
  }

  assertUsage(typeof configServerValue === 'string', 'config.server should be defined')
  return {
    entry: { index: configServerValue },
    runtime: 'node',
    standalone: false,
    external: []
  }
}
