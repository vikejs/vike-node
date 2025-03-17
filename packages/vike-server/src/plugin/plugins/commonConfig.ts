import { getVikeServerConfigs } from '../utils/getVikeServerConfig.js'
import type { Plugin } from 'vite'
import type { ConfigVikeServerResolved } from '../../types.js'

export { commonConfig }

function commonConfig(): Plugin[] {
  let vikeServerConfigs: ConfigVikeServerResolved[]
  return [
    {
      enforce: 'pre',
      name: 'vike-server:commonConfig',

      applyToEnvironment(env) {
        return env.name === 'ssr'
      },

      configEnvironment() {
        const external = vikeServerConfigs.flatMap((c) => c.external)
        return {
          resolve: {
            external,
            // vike-server conditions to respect
            externalConditions: ['node', 'development|production']
          },
          build: {
            target: 'es2022'
          },
          optimizeDeps: {
            exclude: external
          }
        }
      },

      config(config) {
        vikeServerConfigs = getVikeServerConfigs(config)
      }
    }
  ]
}
