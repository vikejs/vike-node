import type { Config } from 'vike/types'
import vikeServer from 'vike-server/config'

const FRAMEWORK = process.env.VIKE_NODE_FRAMEWORK || 'hono'

export default {
  passToClient: ['pageProps'],
  clientRouting: true,
  hydrationCanBeAborted: true,
  extends: [vikeServer],
  server: {
    entry: `./server/index-${FRAMEWORK}.ts`,
    external: ['@node-rs/argon2'],
    standalone: true
  }
} satisfies Config
