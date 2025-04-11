import { type } from 'arktype'
import type { BuildOptions } from 'esbuild'

export const SupportedServers = type("'hono' | 'hattip' | 'elysia' | 'express' | 'fastify' | 'h3'")

export type SupportedServers = typeof SupportedServers.infer

export const PhotonEntryServer = type({
  id: 'string',
  'resolvedId?': 'string',
  type: "'server'",
  server: SupportedServers
})

export const PhotonEntryUniversalHandler = type({
  id: 'string',
  'resolvedId?': 'string',
  type: "'universal-handler'"
})

export const PhotonEntry = type(PhotonEntryServer).or(PhotonEntryUniversalHandler).or({
  id: 'string',
  'resolvedId?': 'string',
  'type?': "'auto'"
})

export type PhotonEntry = typeof PhotonEntry.infer

export type GetPhotonCondition = (condition: 'dev' | 'edge' | 'node', server: string) => string

export const PhotonConfig = type('string').or({
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

export type PhotonConfig = typeof PhotonConfig.infer

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

export type PhotonConfigResolved = typeof PhotonConfigResolved.infer
