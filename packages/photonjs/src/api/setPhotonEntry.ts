import type { PluginContext } from 'rollup'
import { asPhotonEntryId } from '../plugin/utils/entry.js'

export function setPhotonEntry(pluginContext: PluginContext, fileName: string, entry: Photon.Entry) {
  pluginContext.environment.config.photonjs.entry[fileName] = {
    ...entry,
    id: asPhotonEntryId(entry.id)
  }
}
