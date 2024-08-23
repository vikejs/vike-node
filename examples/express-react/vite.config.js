import react from '@vitejs/plugin-react'
import vike from 'vike/plugin'
import vikeNode from 'vike-node/plugin'

export default {
  build: {
    outDir: 'build'
  },
  plugins: [react(), vike(), vikeNode({ entry: 'server/index.js', standalone: true })]
}
