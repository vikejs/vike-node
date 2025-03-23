import type { Plugin } from 'vite'
import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'
import type { ConfigVikeServerResolved } from '../../types.js'

export { commonConfig }

function commonConfig(): Plugin[] {
  let vikeServerConfig: ConfigVikeServerResolved

  return [
    {
      enforce: 'pre',
      name: 'vike-server:commonConfig',

      config(config) {
        vikeServerConfig = getVikeServerConfig(config)
      },

      // applyToEnvironment(experimental) runs after config/configEnvironment and has no effect on them
      // (last time checked: vite@6.2.2)
      configEnvironment(name) {
        const { external } = vikeServerConfig
        const commonConfig = {
          resolve: {
            noExternal: ['vike-server'],
            external
          },
          optimizeDeps: { exclude: external },
          build: {
            target: 'es2022',
            rollupOptions: {
              external
            }
          }
        }

        if (name === 'ssr') {
          return {
            ...commonConfig,
            resolve: {
              ...commonConfig.resolve,
              externalConditions: ['node', 'development|production']
            }
          }
        }

        return commonConfig
      }
    }
  ]
}
