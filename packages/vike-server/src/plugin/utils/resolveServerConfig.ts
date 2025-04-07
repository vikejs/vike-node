import { asPhotonEntryId } from './entry.js'
import type { ConfigVikeServer, ConfigVikeServerResolved, PhotonEntry } from '../../types.js'
import { assert, assertUsage } from '../../utils/assert.js'

export { resolveServerConfig }

function entryToPhoton(entry: string | PhotonEntry): PhotonEntry {
  if (typeof entry === 'string')
    return {
      id: asPhotonEntryId(entry),
      type: 'auto'
    }
  return {
    ...entry,
    id: asPhotonEntryId(entry.id)
  }
}

function entriesToPhoton(
  entry: string | PhotonEntry | Record<string, PhotonEntry | string>
): Record<string, PhotonEntry> {
  if (typeof entry === 'string' || 'id' in entry) {
    return {
      index: entryToPhoton(entry as string | PhotonEntry)
    }
  }

  return Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, entryToPhoton(value)]))
}

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

    const entriesProvided = entriesToPhoton(configServerValue.entry)

    assertUsage('index' in entriesProvided, 'Missing index entry in server.entry')
    return {
      entry: entriesProvided as { index: PhotonEntry; [name: string]: PhotonEntry },
      standalone: configServerValue.standalone ?? false,
      hmr: configServerValue.hmr ?? true
    }
  }

  assertUsage(typeof configServerValue === 'string', 'config.server should be defined')
  return {
    entry: { index: entryToPhoton(configServerValue) },
    standalone: false,
    hmr: true
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
