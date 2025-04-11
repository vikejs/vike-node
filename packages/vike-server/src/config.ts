import type { PhotonConfig } from '@photonjs/core/api'
import { photonjs } from '@photonjs/core/plugin'
import type { Config } from 'vike/types'
import { vikeServer } from './plugin/index.js'

export { config as default }

const config = {
  name: 'vike-server',
  require: {
    vike: '>=0.4.228'
  },
  vite: {
    plugins: [photonjs(), vikeServer()]
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
      server?: PhotonConfig
    }
  }
}
