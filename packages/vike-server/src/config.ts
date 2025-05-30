import { vikeServer } from './plugin/index.js'
import type { ConfigVikeServer } from './types.js'
import type { Config } from 'vike/types'

export { config as default }

const config = {
  name: 'vike-server',
  require: {
    vike: '>=0.4.228',
    ['vike-react']: {
      version: '>=0.6.4',
      optional: true
    },
    ['vike-vue']: {
      version: '>=0.9.2',
      optional: true
    },
    ['vike-solid']: {
      version: '>=0.7.11',
      optional: true
    }
  },
  vite: {
    plugins: [vikeServer()]
  },
  vite6BuilderApp: true,
  // @ts-ignore
  stream: {
    enable: null,
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
