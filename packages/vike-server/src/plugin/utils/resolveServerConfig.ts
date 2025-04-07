import { asPhotonEntryId } from './entry.js'
import { PhotonConfig, PhotonConfigResolved, PhotonEntry } from '../../types.js'
import { match, type } from 'arktype'
import type { BuildOptions } from 'esbuild'

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

export function resolvePhotonConfig(config: PhotonConfig | undefined): PhotonConfigResolved {
  const out = PhotonConfig.pipe.try((c) => {
    const toPhotonEntry = match
      .in<PhotonConfig>()
      .match({
        string: (v) => entriesToPhoton(v)
      })
      .default(
        match
          .in<PhotonConfig>()
          .at('entry')
          .case({ id: 'string' }, (v) => entriesToPhoton(v.entry))
          .case({ '[string]': 'string' }, (v) => entriesToPhoton(v.entry))
          .case({ '[string]': PhotonEntry }, (v) => entriesToPhoton(v.entry))
          .default('assert')
      )

    const toHmr = match
      .in<PhotonConfig>()
      .match({
        'boolean | "prefer-restart"': (v) => v
      })
      .default(() => true)

    const toStandalone = match
      .in<PhotonConfig>()
      .case({ standalone: 'boolean' }, (v) => v)
      .case({ standalone: 'object' }, (v) => v as type.cast<Omit<BuildOptions, 'manifest'>>)
      .default(() => false)

    const entry = toPhotonEntry(c)
    const hmr = toHmr(c)
    const standalone = toStandalone(c)

    return {
      entry,
      hmr,
      standalone
    }
  }, PhotonConfigResolved)(config)

  if (out instanceof type.errors) return out.throw()
  return out
}
