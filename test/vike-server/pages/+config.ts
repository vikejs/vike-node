import type { Config } from 'vike/types'
import vikeServer from 'vike-server/config'

const FRAMEWORK = process.env.VIKE_NODE_FRAMEWORK || 'hono'

export default {
  passToClient: ['pageProps'],
  clientRouting: true,
  hydrationCanBeAborted: true,
  extends: [vikeServer],
  server: {
    entry: { index: `./server/index-${FRAMEWORK}.ts`, worker: './server/worker.js' }
  }
} satisfies Config
