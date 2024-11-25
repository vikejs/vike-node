export { vikeNode, vikeNode as default }

import { globalStore } from '../runtime/globalStore.js'
import { ConfigVikeNodePlugin } from '../types.js'
import { commonConfig } from './plugins/commonConfig.js'
import { devServerPlugin } from './plugins/devServerPlugin.js'
import { edgePlugin } from './plugins/edgePlugin.js'
import { serverEntryPlugin } from './plugins/serverEntryPlugin.js'
import { standalonePlugin } from './plugins/standalonePlugin.js'

globalStore.isDev = true

function vikeNode(config: ConfigVikeNodePlugin) {
  return [commonConfig(config), serverEntryPlugin(), devServerPlugin(), standalonePlugin(), edgePlugin()]
}
