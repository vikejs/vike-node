import react from '@vitejs/plugin-react'
import { telefunc } from 'telefunc/vite'
import vikeNode from 'vike-server/plugin'
import vike from 'vike/plugin'

export default {
  plugins: [
    vike({ prerender: true }),
    vikeNode({
      entry: {
        index: 'server/node-entry.js',
        cloudflare: {
          entry: 'server/app.js',
          runtime: 'cloudflare',
          scaffold: 'dist/cloudflare'
        }
      }
    }),
    react(),
    telefunc()
  ]
}
