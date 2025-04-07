import type { Plugin } from 'vite'
import { getVikeConfig } from 'vike/plugin'

export function vikeServerConfigToPhotonPlugin(): Plugin {
  return {
    name: 'vike-server:to-photon-config',
    async config(userConfig) {
      const vikeConfig = getVikeConfig(userConfig)

      if (vikeConfig.config.server) {
        return {
          photonjs: vikeConfig.config.server
        }
      }
    }
  }
}
