import react from '@vitejs/plugin-react'
import vike from 'vike/plugin'
import vikeNode from 'vike-node/plugin'
import { pages } from 'vike-cloudflare'

export default {
  plugins: [
    react(),
    vike({ prerender: true }),
    vikeNode('server/node-entry.js'),
    pages({
      server: {
        kind: 'hono',
        entry: 'server/app.js'
      }
    })
  ]
}
