export { vikeServer, vikeServer as default }

import pc from '@brillout/picocolors'
import { assertUsage } from '../utils/assert.js'
import { commonConfig } from './plugins/commonConfig.js'
import { devServerPlugin } from './plugins/devServerPlugin.js'
import { serverEntryPlugin } from './plugins/serverEntryPlugin.js'
import { standalonePlugin } from './plugins/standalonePlugin.js'
import { checkEdge } from './plugins/edgePlugin.js'

function vikeServer() {
  return [
    ...commonConfig(),
    ...checkEdge(),
    serverEntryPlugin(),
    devServerPlugin(),
    standalonePlugin(),
    {
      name: 'vike-server:forbid-vite-preview-command',
      configurePreviewServer() {
        assertUsage(
          false,
          `${pc.cyan('$ vike preview')} isn't supported: directly execute the server production entry (for example ${pc.cyan('$ node dist/server/index.mjs')}) instead.`
        )
      }
    }
  ]
}
