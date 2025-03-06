export { commonConfig }

import type { Plugin } from 'vite'
import type { ConfigVikeNodePlugin, ConfigVikeNodeResolved } from '../../types.js'
import { resolveConfig } from '../utils/resolveConfig.js'
import { getRuntimeKey } from '@universal-middleware/core'

function commonConfig(configVikeNodePlugin: ConfigVikeNodePlugin): Plugin[] {
  const resolvedConfig: ConfigVikeNodeResolved = resolveConfig({ server: configVikeNodePlugin })

  return [
    {
      enforce: 'pre',
      name: 'vike-server:commonConfig',
      config(config, env) {
        const isDev = env.command === 'serve'
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
            __DEV__: JSON.stringify(isDev),
            __VIKE_RUNTIME__: JSON.stringify(isDev ? getRuntimeKey() : resolvedConfig.server.runtime)
          }
        }
      }
    }
  ]
}
