import { resolvePhotonConfig } from '@photonjs/core/api'
import { getVikeConfig } from 'vike/plugin'
import type { Plugin } from 'vite'

export function vikeServerConfigToPhotonPlugin(): Plugin {
  return {
    name: 'vike-server:to-photon-config',
    async config(userConfig) {
      const vikeConfig = getVikeConfig(userConfig)

      if (vikeConfig.config.server) {
        return {
          photonjs: resolvePhotonConfig(vikeConfig.config.server)
        }
      }
    }
  }
}
