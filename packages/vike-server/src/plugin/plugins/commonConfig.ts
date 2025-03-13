import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'
import type { Plugin } from 'vite'

export { commonConfig }

function commonConfig(): Plugin[] {
  return [
    {
      enforce: 'pre',
      name: 'vike-server:commonConfig',

      config(config, env) {
        const vikeServerConfig = getVikeServerConfig(config)
        return {
          resolve: {
            // vike-server conditions to respect
            externalConditions: ['node', 'development']
          },
          build: {
            target: 'es2022'
          },
          ssr: {
            external: vikeServerConfig.external
          },
          optimizeDeps: {
            exclude: vikeServerConfig.external
          }
        }
      }
    }
  ]
}
