import { Config } from 'vike/types'
import vikeNode from './plugin/index.js'
import type { ConfigVikeNode } from './types.js'

declare global {
  namespace Vike {
    interface Config extends ConfigVikeNode {}
  }
}

export default {
  vite: {
    plugins: [vikeNode()]
  },
  _internal: {
    disableDevMiddleware: true
  },
  meta: {
    server: {
      env: {
        config: true
      }
    }
  }
} satisfies Config
