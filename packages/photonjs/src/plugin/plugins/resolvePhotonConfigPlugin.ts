import type { Plugin } from 'vite'
import { resolvePhotonConfig } from '../../validators/coerce.js'

export function resolvePhotonConfigPlugin(userConfig?: Photon.Config): Plugin {
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
        config.photonjs = resolvePhotonConfig(config.photonjs, true)
      }
    }
  }
}
