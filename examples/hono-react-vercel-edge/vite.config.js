import react from '@vitejs/plugin-react'
import { telefunc } from 'telefunc/vite'
import vike from 'vike/plugin'

export default {
  plugins: [vike({ prerender: true }), react(), telefunc()]
}
