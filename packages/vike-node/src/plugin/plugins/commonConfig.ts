export { commonConfig }

import type { Plugin } from 'vite'
import { ConfigVikeNodeResolved } from '../../types.js'

function commonConfig(resolvedConfig: ConfigVikeNodeResolved): Plugin {
  return {
    name: 'vike-node:commonConfig',
    enforce: 'post',
    config() {
      return {
        ssr: {
          external: resolvedConfig.server.native
        },
        optimizeDeps: {
          exclude: resolvedConfig.server.native
        }
      }
    }
  }
}
