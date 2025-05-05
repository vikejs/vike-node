import { photon } from '@photonjs/core/vite'
import type { Config } from 'vike/types'
import { vikeServer } from './plugin/index.js'

export { config as default }

const config = {
  name: 'vike-server',
  require: {
    vike: '>=0.4.228'
  },
  vite: {
    plugins: [photon(), vikeServer()]
  },
  vite6BuilderApp: true,
  meta: {
    server: {
      env: { config: true },
      global: true
    }
  }
} satisfies Config

declare global {
  namespace Vike {
    interface Config {
      server?: Photon.Config
    }
  }
}
