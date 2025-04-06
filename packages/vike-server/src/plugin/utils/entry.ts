import { assert } from '../../utils/assert.js'

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
