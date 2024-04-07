export { commonConfig }

import type { Plugin } from 'vite'
import { ConfigVikeNodeResolved } from '../../types.js'
import { resolveConfig } from '../utils/resolveConfig.js'

function commonConfig(): Plugin {
  return {
    name: 'vike-node:commonConfig',
    enforce: 'pre',
    config(config, env) {
      const server = { entry: './server/index-hono.ts', standalone: true }
      const resolvedConfig: ConfigVikeNodeResolved = resolveConfig({ server })
      ;(config as Record<string, unknown>).configVikeNode = resolvedConfig

      return {
        environments: {
          ssr: {
            resolve: { external: resolvedConfig.server.native }
          },
          client: {
            resolve: { external: resolvedConfig.server.native }
          }
        },
        optimizeDeps: {
          exclude: resolvedConfig.server.native,
        }
      }
    }
  }
}
