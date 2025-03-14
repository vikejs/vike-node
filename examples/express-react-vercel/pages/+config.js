export { config }

import vikeReact from 'vike-react/config'
import vikeServer from 'vike-server/config'

const config = {
  // https://vike.dev/extends
  extends: [vikeReact, vikeServer],
  server: 'server/index.js',
  prerender: false
}
