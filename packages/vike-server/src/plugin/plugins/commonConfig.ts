import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'
import type { Plugin } from 'vite'
import type { ConfigVikeServerResolved } from '../../types.js'

export { commonConfig }

function commonConfig(): Plugin[] {
  let vikeServerConfig: ConfigVikeServerResolved
  return [
    {
      enforce: 'pre',
      name: 'vike-server:commonConfig',

      applyToEnvironment(env) {
        return env.name === 'ssr'
      },

      configEnvironment() {
        return {
          resolve: {
            external: vikeServerConfig.external,
            // vike-server conditions to respect
            externalConditions: ['node', 'development|production']
          },
          build: {
            target: 'es2022'
          },
          optimizeDeps: {
            exclude: vikeServerConfig.external
          }
        }
      },

      config(config) {
        vikeServerConfig = getVikeServerConfig(config)
      }
    }
  ]
}
