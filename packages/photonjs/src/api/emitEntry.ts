import type { PluginContext } from 'rollup'
import { asPhotonEntryId } from '../plugin/utils/entry.js'

export function emitEntry(pluginContext: PluginContext, fileName: string, entry: Photon.Entry) {
  pluginContext.environment.config.photonjs.entry[fileName] = entry
  pluginContext.emitFile({
    type: 'chunk',
    fileName: fileName.match(/\.[cm]?js$/) ? fileName : `${fileName}.js`,
    id: asPhotonEntryId(entry.id)
  })
}
