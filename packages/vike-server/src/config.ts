import { vikeServer } from './plugin/index.js'
import type { ConfigVikeServer } from './types.js'
import type { Config } from 'vike/types'

export { config as default }

const config = {
  name: 'vike-server',
  require: {
    vike: '>=0.4.224'
  },
  vite: {
    plugins: [vikeServer()]
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
      server?: ConfigVikeServer['server']
    }
  }
}
