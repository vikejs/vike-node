import 'vite'
import type { PhotonConfig, PhotonConfigResolved } from './types.js'

export { PhotonEntry, PhotonConfig, PhotonConfigResolved, SupportedServers } from './types.js'
export { isPhotonMeta, type PhotonMeta } from './plugin/utils/entry.js'
export { resolvePhotonConfig } from './plugin/utils/resolvePhotonConfig.js'

declare module 'vite' {
  interface UserConfig {
    photonjs?: typeof PhotonConfig.infer
  }

  interface ResolvedConfig {
    photonjs: typeof PhotonConfigResolved.infer
  }
}
