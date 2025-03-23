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
        if (name !== 'ssr')
          return {
            build: {
              target: 'es2022'
            }
          }
        const { external } = vikeServerConfig
        return {
          resolve: {
            externalConditions: ['node', 'development|production'],
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
      }
    }
  ]
}
