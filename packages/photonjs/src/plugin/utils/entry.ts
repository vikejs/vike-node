import type { CustomPluginOptions } from 'rollup'
import { assert } from '../../utils/assert.js'
import type { SupportedServers } from '../../validators/types.js'

export const virtualPhotonEntry = 'photonjs:entry'

export function isPhotonEntryId(id: string) {
  return id.startsWith(virtualPhotonEntry)
}

export function asPhotonEntryId(id: string) {
  if (isPhotonEntryId(id)) return id
  return `${virtualPhotonEntry}:${id}`
}

export function assertPhotonEntryId(id: string) {
  assert(isPhotonEntryId(id))
}

export function stripPhotonEntryId(id: string) {
  return isPhotonEntryId(id) ? id.substring(virtualPhotonEntry.length + 1) : id
}

export function isPhotonMeta(meta?: CustomPluginOptions): meta is { photonjs: PhotonMeta } {
  return Boolean(meta && 'photonjs' in meta)
}

export interface PhotonMetaServer {
  type: 'server'
  server: SupportedServers
}

export interface PhotonMetaUniversalHandler {
  type: 'universal-handler'
}

export type PhotonMeta = PhotonMetaServer | PhotonMetaUniversalHandler | { type?: 'auto' }
