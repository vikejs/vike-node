import { serverEntryPlugin } from './plugins/serverEntryPlugin.js'
import { standalonePlugin } from './plugins/standalonePlugin.js'
import { vikeServerConfigToPhotonPlugin } from './plugins/vikeServerConfigToPhotonPlugin.js'

export { vikeServer, vikeServer as default }

function vikeServer() {
  return [vikeServerConfigToPhotonPlugin(), ...serverEntryPlugin(), standalonePlugin()]
}
