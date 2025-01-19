export { vikeNode, vikeNode as default }

import pc from '@brillout/picocolors'
import { globalStore } from '../runtime/globalStore.js'
import type { ConfigVikeNodePlugin } from '../types.js'
import { assertUsage } from '../utils/assert.js'
import { commonConfig } from './plugins/commonConfig.js'
import { devServerPlugin } from './plugins/devServerPlugin.js'
import { edgePlugin } from './plugins/edgePlugin.js'
import { serverEntryPlugin } from './plugins/serverEntryPlugin.js'
import { standalonePlugin } from './plugins/standalonePlugin.js'
import { vikeHandlerPlugin } from './plugins/vikeHandlerPlugin.js'

globalStore.isDev = true

function vikeNode(config: ConfigVikeNodePlugin) {
  return [
    commonConfig(config),
    serverEntryPlugin(),
    devServerPlugin(),
    standalonePlugin(),
    edgePlugin(),
    vikeHandlerPlugin(),
    {
      name: 'vike-node:forbid-vite-preview-command',
      configurePreviewServer() {
        assertUsage(
          false,
          `${pc.cyan('$ vike preview')} isn't supported: directly execute the server production entry (for example ${pc.cyan('$ node dist/server/index.mjs')}) instead.`
        )
      }
    }
  ]
}
