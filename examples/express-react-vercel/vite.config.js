import react from '@vitejs/plugin-react'
import vike from 'vike/plugin'
import vikeNode from 'vike-server/plugin'

export default {
  plugins: [react(), vike({ prerender: true }), vikeNode('server/index.js')]
}
