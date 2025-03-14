export { config }

import vikeReact from 'vike-react/config'
import vikeServer from 'vike-server/config'

// FIXME symlink to vike-cloudflare repo
const config = {
  // https://vike.dev/extends
  extends: [vikeReact, vikeServer],
  prerender: false,
  server: {
    entry: {
      index: 'server/node-entry.js',
      cloudflare: {
        entry: 'server/app.js',
        runtime: 'cloudflare',
        scaffold: 'dist/cloudflare'
      }
    }
  }
}
