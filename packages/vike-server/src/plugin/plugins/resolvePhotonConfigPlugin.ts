import type { Plugin } from 'vite'
import { resolvePhotonConfig } from '../utils/resolveServerConfig.js'
import type { PhotonConfig, PhotonConfigResolved } from '../../types.js'

declare module 'vite' {
  interface UserConfig {
    photonjs?: PhotonConfig
  }

  interface ResolvedConfig {
    photonjs: PhotonConfigResolved
  }
}

export function resolvePhotonConfigPlugin(userConfig?: PhotonConfig): Plugin {
  return {
    name: 'photonjs:resolve-config',
    enforce: 'pre',

    config() {
      if (userConfig) {
        return {
          photonjs: userConfig
        }
      }
    },

    configResolved: {
      order: 'pre',
      handler(config) {
        config.photonjs = resolvePhotonConfig(config.photonjs)
      }
    }
  }
}
