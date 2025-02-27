export { commonConfig }

import type { Plugin } from 'vite'
import type { ConfigVikeNodePlugin, ConfigVikeNodeResolved } from '../../types.js'
import { resolveConfig } from '../utils/resolveConfig.js'

function commonConfig(configVikeNodePlugin: ConfigVikeNodePlugin): Plugin[] {
  const resolvedConfig: ConfigVikeNodeResolved = resolveConfig({ server: configVikeNodePlugin })
  return [
    {
      enforce: 'pre',
      name: 'vike-server:commonConfig',
      config(config, env) {
        ;(config as Record<string, unknown>).configVikeNode = resolvedConfig
        return {
          build: {
            target: 'es2022'
          },
          ssr: {
            external: resolvedConfig.server.external
          },
          optimizeDeps: {
            exclude: resolvedConfig.server.external
          },
          define: {
            __DEV__: JSON.stringify(env.command === 'serve')
          }
        }
      }
    }
  ]
}
