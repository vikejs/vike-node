import type { PhotonConfig } from '../types.js'
import { commonConfig } from './plugins/commonConfig.js'
import { devServer } from './plugins/devServer.js'
import { fallback } from './plugins/fallback.js'
import { getMiddlewaresPlugin } from './plugins/getMiddlewaresPlugin.js'
import { photonEntry } from './plugins/photonEntry.js'
import { resolvePhotonConfigPlugin } from './plugins/resolvePhotonConfigPlugin.js'

export { photonjs, photonjs as default }

function photonjs(config?: PhotonConfig) {
  return [
    ...commonConfig(),
    resolvePhotonConfigPlugin(config),
    ...photonEntry(),
    fallback(),
    devServer(),
    getMiddlewaresPlugin()
  ]
}
