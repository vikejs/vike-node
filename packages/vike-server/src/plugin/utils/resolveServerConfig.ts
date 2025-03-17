export { resolveServerConfig }

import type { ConfigVikeServer, ConfigVikeServerResolved } from '../../types.js'
import { assert, assertUsage } from '../../utils/assert.js'

function _resolveServerConfig(configServerValue: ConfigVikeServer['server'] | undefined): ConfigVikeServerResolved {
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
      standalone: configServerValue.standalone ?? false,
      external: configServerValue.external ?? []
    }
  }

  assertUsage(typeof configServerValue === 'string', 'config.server should be defined')
  return {
    entry: { index: configServerValue },
    standalone: false,
    external: []
  }
}

// cache
const configServerValueResolved = new WeakMap<ConfigVikeServer['server'][], ConfigVikeServerResolved[]>()
function resolveServerConfig(
  configServerValue: ConfigVikeServer['server'][] | undefined
): [ConfigVikeServerResolved] | [ConfigVikeServerResolved, ConfigVikeServerResolved] {
  assert(configServerValue)
  assertUsage(configServerValue.length > 0, 'config.server should be defined')
  // length 1: user entry, or virtual entry
  // length 2: [user entry, virtual entry]
  assert(configServerValue.length <= 2)
  if (!configServerValueResolved.has(configServerValue)) {
    configServerValueResolved.set(configServerValue, configServerValue.map(_resolveServerConfig))
  }
  return configServerValueResolved.get(configServerValue) as
    | [ConfigVikeServerResolved]
    | [ConfigVikeServerResolved, ConfigVikeServerResolved]
}
