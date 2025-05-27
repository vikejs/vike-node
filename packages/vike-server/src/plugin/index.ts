import { installPhoton } from '@photonjs/core/vite'
import type { Plugin } from 'vite'
import { serverEntryPlugin } from './plugins/serverEntryPlugin.js'
import { setPhotonMeta } from './plugins/setPhotonMeta.js'
import { standalonePlugin } from './plugins/standalonePlugin.js'
import { vikeServerConfigToPhotonPlugin } from './plugins/vikeServerConfigToPhotonPlugin.js'

export { vikeServer, vikeServer as default }

function vikeServer(): Plugin[] {
  return [
    vikeServerConfigToPhotonPlugin(),
    ...serverEntryPlugin(),
    standalonePlugin(),
    setPhotonMeta(),
    ...installPhoton('vike-server', {
      resolveMiddlewares() {
        return 'vike-server/universal-middlewares'
      }
    })
  ]
}
