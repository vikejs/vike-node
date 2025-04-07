import type { BuildOptions } from 'esbuild'
import { type } from 'arktype'

export const PhotonEntry = type({
  id: 'string',
  'type?': "'auto' | 'server' | 'universal-handler'"
})

export type PhotonEntry = typeof PhotonEntry.infer

export const PhotonConfig = type('string').or({
  entry: PhotonEntry.or({
    index: type('string').or(PhotonEntry),
    '[string]': type('string').or(PhotonEntry)
  }).or('string'),
  'hmr?': "boolean | 'prefer-restart'",
  'standalone?': type('boolean').or({
    esbuild: 'object' as type.cast<Omit<BuildOptions, 'manifest'>>
  })
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
  })
})

export type PhotonConfigResolved = typeof PhotonConfigResolved.infer

export type SupportedServers = 'hono' | 'hattip' | 'elysia' | 'express' | 'fastify' | 'h3'
