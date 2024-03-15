import react from '@vitejs/plugin-react'
import { telefunc } from 'telefunc/vite'
import vikeNode from 'vike-node/plugin'
import vike from 'vike/plugin'

export default {
  plugins: [
    react(),
    vike(),
    vikeNode(),
    telefunc()
  ]
}
