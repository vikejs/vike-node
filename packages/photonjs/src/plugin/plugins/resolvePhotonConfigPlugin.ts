import type { Plugin } from 'vite'
import { resolvePhotonConfig } from '../utils/resolvePhotonConfig.js'
import type { PhotonConfig } from '../../types.js'

export function resolvePhotonConfigPlugin(userConfig?: typeof PhotonConfig.infer): Plugin {
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
