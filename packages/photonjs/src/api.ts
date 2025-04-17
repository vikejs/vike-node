import 'vite'
import './types.js'

export { isPhotonMeta, type PhotonMeta } from './plugin/utils/entry.js'
export { resolvePhotonConfig } from './validators/coerce.js'
export { definePhotonLib } from './plugin/plugins/definePhotonLib.js'
export { setPhotonEntry } from './api/setPhotonEntry.js'

declare module 'vite' {
  interface UserConfig {
    photonjs?: Photon.Config
  }

  interface ResolvedConfig {
    photonjs: Photon.ConfigResolved
  }
}
