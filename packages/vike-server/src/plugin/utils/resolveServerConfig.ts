export { resolveServerConfig }

import type { ConfigVikeServerPlugin, ConfigVikeServerResolved } from '../../types.js'
import { assertUsage } from '../../utils/assert.js'

function resolveServerConfig(
  configServerValue: ConfigVikeServerPlugin | ConfigVikeServerPlugin[] | undefined
): ConfigVikeServerResolved {
  // If another extension (like vike-cloudflare) sets the `server` config as cumulative, we need to:
  //  - ensure that we only have 2 values (one set by vike extension, one by the user)
  //  - the first one, set by the user, must have an entry, but it will only be used by the vike extension
  //  - the second one, set by the vike extension, is the one we'll actually use here
  if (Array.isArray(configServerValue)) {
    assertUsage(configServerValue.length <= 2, 'config.server must be specified only once and not be an array')
    assertUsage(configServerValue.length >= 2, 'config.server should be defined')
    // Check validity of entry
    resolveServerConfig(configServerValue[0])
    return resolveServerConfig(configServerValue[1])
  }

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
