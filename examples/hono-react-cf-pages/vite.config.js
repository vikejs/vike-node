import react from '@vitejs/plugin-react'
import vike from 'vike/plugin'
import vikeNode from 'vike-node/plugin'
import { pages } from 'vike-cloudflare'

export default {
  plugins: [
    react(),
    vike({ prerender: true }),
    vikeNode({ entry: 'server/node-entry.js', external: ['vike-node/__handler'] }),
    pages({
      server: {
        kind: 'hono',
        entry: 'server/hono-entry.js'
      }
    })
  ]
}
