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
    // TODO use photon helper
    {
      name: 'photonjs:define-entries:vike-server',
      config() {
        return {
          photonjs: {
            middlewares: [() => 'vike-server/universal-middlewares']
          }
        }
      }
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } as any
  ]
}
