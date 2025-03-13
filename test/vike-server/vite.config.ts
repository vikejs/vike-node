import react from '@vitejs/plugin-react'
import { telefunc } from 'telefunc/vite'
import vike from 'vike/plugin'

export default {
  plugins: [react(), telefunc(), vike()],
  // Make test more interesting: avoid vite-plugin-server-entry from [finding the server entry by searching for the dist/ directory](https://github.com/brillout/vite-plugin-server-entry/blob/240f59b4849a3fdfd84448117a3aaf4fbe95a8a0/src/runtime/crawlServerEntry.ts)
  build: { outDir: 'build' }
}
