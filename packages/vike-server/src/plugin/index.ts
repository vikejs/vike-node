import { photonEntryPlugin } from './plugins/photonEntryPlugin.js'
import { commonConfig } from './plugins/commonConfig.js'
import { devServerPlugin } from './plugins/devServerPlugin.js'
import { serverEntryPlugin } from './plugins/serverEntryPlugin.js'
import { standalonePlugin } from './plugins/standalonePlugin.js'
import type { PhotonConfig } from '../types.js'
import { resolvePhotonConfigPlugin } from './plugins/resolvePhotonConfigPlugin.js'
import { vikeServerConfigToPhotonPlugin } from './plugins/vikeServerConfigToPhotonPlugin.js'

export { vikeServer, vikeServer as default }

function vikeServer(config?: PhotonConfig) {
  return [
    ...commonConfig(),
    resolvePhotonConfigPlugin(config),
    vikeServerConfigToPhotonPlugin(),
    ...photonEntryPlugin(),
    ...serverEntryPlugin(),
    devServerPlugin(),
    standalonePlugin()
  ]
}
