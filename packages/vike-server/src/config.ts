import { vikeServer } from './plugin/index.js'
import type { ConfigVikeServer } from './types.js'
import type { Config } from 'vike/types'

export { config as default }

const config = {
  name: 'vike-server',
  require: {
    vike: '>=0.4.228'
  },
  vite: {
    plugins: [vikeServer()]
  },
  vite6BuilderApp: true,
  // @ts-ignore
  stream: {
    enable: true,
    type: 'web'
  },
  meta: {
    server: {
      env: { config: true },
      // The server entry can be overriden by vike-cloudflare and such
      cumulative: true,
      global: true
    },
    // +stream is already defined by vike-{react,vue,solid} but we define it again here to avoid Vike throwing the "unknown config" error if the user doesn't use vike-{react,vue,solid}
    stream: {
      env: { server: true },
      cumulative: true
    }
  }
} satisfies Config

declare global {
  namespace Vike {
    interface Config {
      server?: ConfigVikeServer['server']
    }
    interface ConfigResolved {
      server?: ConfigVikeServer['server'][]
    }
  }
}
