export { commonConfig }

import type { Plugin } from 'vite'
import { ConfigVikeNodeResolved } from '../../types.js'
import { resolveConfig } from '../utils/resolveConfig.js'
import type { Config } from 'vike/types'

function commonConfig(): Plugin {
  return {
    name: 'vike-node:commonConfig',
    enforce: 'pre',
    configResolved(config) {
      const server = { entry: './server/index-hattip.ts', standalone: true }
      const resolvedConfig: ConfigVikeNodeResolved = resolveConfig({ server })
      ;(config as Record<string, unknown>).configVikeNode = resolvedConfig

      console.log(resolvedConfig)

      if (typeof config.ssr.external !== 'boolean') {
        config.ssr.external ??= []
        config.ssr.external.push(...resolvedConfig.server.native)
      }
      config.optimizeDeps.exclude ??= []
      config.optimizeDeps.exclude.push(...resolvedConfig.server.native)
    }
  }
}
