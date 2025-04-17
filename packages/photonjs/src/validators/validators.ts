import { type } from 'arktype'
import type { BuildOptions } from 'esbuild'

export type GetPhotonCondition = (condition: 'dev' | 'edge' | 'node', server: string) => string

export const SupportedServers = type("'hono' | 'hattip' | 'elysia' | 'express' | 'fastify' | 'h3'")

export const PhotonEntryBase = type({
  id: 'string',
  'route?': 'string',
  'resolvedId?': 'string'
})

export const PhotonEntryServer = type({
  '...': PhotonEntryBase,
  type: "'server'",
  server: SupportedServers
})

export const PhotonEntryUniversalHandler = type({
  '...': PhotonEntryBase,
  type: "'universal-handler'"
})

export const PhotonEntryAuto = type({
  '...': PhotonEntryBase,
  'type?': "'auto'"
})

export const PhotonEntry = type(PhotonEntryServer).or(PhotonEntryUniversalHandler).or(PhotonEntryAuto)

export const PhotonConfig = type({
  'entry?': PhotonEntry.or({
    index: type('string').or(PhotonEntry),
    '[string]': type('string').or(PhotonEntry)
  }).or('string'),
  'hmr?': "boolean | 'prefer-restart'",
  // TODO remove
  'standalone?': type('boolean').or({
    esbuild: 'object' as type.cast<Omit<BuildOptions, 'manifest'>>
  }),
  'middlewares?': 'object' as type.cast<GetPhotonCondition[]>
})

export const PhotonConfigResolved = type({
  entry: {
    index: PhotonEntry,
    '[string]': PhotonEntry
  },
  hmr: "boolean | 'prefer-restart'",
  standalone: type('boolean').or({
    esbuild: 'object' as type.cast<Omit<BuildOptions, 'manifest'>>
  }),
  'middlewares?': 'object' as type.cast<GetPhotonCondition[]>
})
