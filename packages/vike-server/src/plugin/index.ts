import { definePhotonLib } from '@photonjs/core/api'
import type { Plugin } from 'vite'
import { serverEntryPlugin } from './plugins/serverEntryPlugin.js'
import { standalonePlugin } from './plugins/standalonePlugin.js'
import { vikeServerConfigToPhotonPlugin } from './plugins/vikeServerConfigToPhotonPlugin.js'

export { vikeServer, vikeServer as default }

function vikeServer(): Plugin[] {
  return [
    vikeServerConfigToPhotonPlugin(),
    ...serverEntryPlugin(),
    standalonePlugin(),
    ...definePhotonLib('vike-server', {
      resolveMiddlewares() {
        return 'vike-server/universal-middlewares'
      }
    })
  ]
}
