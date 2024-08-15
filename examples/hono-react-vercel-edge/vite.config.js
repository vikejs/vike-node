import react from '@vitejs/plugin-react'
import { telefunc } from 'telefunc/vite'
import vikeNode from 'vike-node/plugin'
import vike from 'vike/plugin'

export default {
  plugins: [
    vike({ prerender: true }),
    vikeNode({
      entry: {
        index: 'server/node-entry.js',
        app: {
          path: 'server/app.js',
          runtime: 'vercel'
        }
      }
    }),
    react(),
    telefunc()
  ]
}
