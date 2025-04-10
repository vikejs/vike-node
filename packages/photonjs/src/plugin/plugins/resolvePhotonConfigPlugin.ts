import type { Plugin } from 'vite'
import type { PhotonConfig } from '../../types.js'
import { resolvePhotonConfig } from '../utils/resolvePhotonConfig.js'

export function resolvePhotonConfigPlugin(userConfig?: typeof PhotonConfig.infer): Plugin {
  return {
    name: 'photonjs:resolve-config',
    enforce: 'pre',

    config() {
      if (userConfig) {
        return {
          photonjs: resolvePhotonConfig(userConfig)
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
