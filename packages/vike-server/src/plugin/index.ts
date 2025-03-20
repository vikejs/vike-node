export { vikeServer, vikeServer as default }

import { commonConfig } from './plugins/commonConfig.js'
import { devServerPlugin } from './plugins/devServerPlugin.js'
import { serverEntryPlugin } from './plugins/serverEntryPlugin.js'
import { standalonePlugin } from './plugins/standalonePlugin.js'

function vikeServer() {
  return [
    //
    ...commonConfig(),
    serverEntryPlugin(),
    devServerPlugin(),
    standalonePlugin()
  ]
}
