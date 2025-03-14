export { config }

import vikeReact from 'vike-react/config'
import vikeServer from 'vike-server/config'

// FIXME symlink to vike-vercel repo
const config = {
  // https://vike.dev/extends
  extends: [vikeReact, vikeServer],
  stream: false,
  server: {
    entry: {
      index: 'server/node-entry.js',
      app: {
        entry: 'server/app.js',
        runtime: 'vercel'
      }
    }
  }
}
