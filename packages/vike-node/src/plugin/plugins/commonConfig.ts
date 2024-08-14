export { commonConfig }

import type { Plugin } from 'vite'
import type { ConfigVikeNodePlugin, ConfigVikeNodeResolved } from '../../types.js'
import { resolveConfig } from '../utils/resolveConfig.js'

function commonConfig(configVikeNodePlugin: ConfigVikeNodePlugin): Plugin[] {
  const resolvedConfig: ConfigVikeNodeResolved = resolveConfig({ server: configVikeNodePlugin })
  return [
    {
      enforce: 'pre',
      name: 'vike-node:commonConfig',
      config(config) {
        ;(config as Record<string, unknown>).configVikeNode = resolvedConfig
        return {
          ssr: {
            external: resolvedConfig.server.external
          },
          optimizeDeps: {
            exclude: resolvedConfig.server.external
          }
        }
      }
    }
  ]
}
