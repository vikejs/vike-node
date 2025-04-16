import { match, type } from 'arktype'
import type { BuildOptions } from 'esbuild'
import { asPhotonEntryId } from '../plugin/utils/entry.js'
import type { PhotonConfig, PhotonConfigResolved, PhotonEntry } from './types.js'
import * as Validators from './validators.js'

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

export function resolvePhotonConfig(config: PhotonConfig | undefined, fallback?: boolean): PhotonConfigResolved {
  const out = Validators.PhotonConfig.pipe.try((c) => {
    const toPhotonEntry = match
      .in<PhotonConfig>()
      .match({
        string: (v) => entriesToPhoton(v)
      })
      .case(
        { entry: 'unknown' },
        match
          .at('entry')
          .match({
            string: (v) => entriesToPhoton(v.entry)
          })
          .case({ id: 'string' }, (v) => entriesToPhoton(v.entry))
          .case({ '[string]': 'string' }, (v) => entriesToPhoton(v.entry))
          .case({ '[string]': Validators.PhotonEntry }, (v) => entriesToPhoton(v.entry))
          .default('assert')
      )
      .default(
        fallback
          ? // Fallback to a simple Hono server for now for simplicity
            () =>
              entriesToPhoton({
                id: 'photonjs:fallback-entry',
                type: 'server',
                server: 'hono'
              })
          : 'assert'
      )

    const toHmr = match
      .in<PhotonConfig>()
      .case({ hmr: 'boolean | "prefer-restart"' }, (v) => v.hmr)
      .default(() => true)

    const toStandalone = match
      .in<PhotonConfig>()
      .case({ standalone: 'boolean' }, (v) => v.standalone)
      .case({ standalone: 'object' }, (v) => v.standalone as type.cast<Omit<BuildOptions, 'manifest'>>)
      .default(() => false)

    const toMiddlewares = match
      .in<PhotonConfig>()
      .case({ middlewares: 'object' }, (v) => v.middlewares)
      .default(() => [])

    const toRest = match
      .in<PhotonConfig>()
      .case({ '[string]': 'unknown' }, (v) => {
        const { entry, hmr, standalone, middlewares, ...rest } = v
        return rest
      })
      .default(() => ({}))

    const entry = toPhotonEntry(c)
    const hmr = toHmr(c)
    const standalone = toStandalone(c)
    const middlewares = toMiddlewares(c)
    // Allows Photon targets to add custom options
    const rest = toRest(c)

    return {
      entry,
      hmr,
      standalone,
      middlewares,
      ...rest
    }
  }, Validators.PhotonConfigResolved)(config)

  if (out instanceof type.errors) return out.throw()
  return out
}
