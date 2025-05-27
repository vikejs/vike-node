import vikeServer from 'vike-server/config'
import type { Config } from 'vike/types'

const FRAMEWORK = process.env.VIKE_NODE_FRAMEWORK || 'hono'

export default {
  passToClient: ['pageProps'],
  clientRouting: true,
  hydrationCanBeAborted: true,
  extends: [vikeServer],
  server: {
    server: `./server/index-${FRAMEWORK}.ts`
  },
  redirects: {
    '/about-redirect': '/about',
    '/external-redirect': 'https://vike.dev/'
  }
} satisfies Config
