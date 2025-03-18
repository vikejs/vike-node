export { config }

import vikeServer from 'vike-server/config'

const config = {
  // https://vike.dev/extends
  extends: [vikeServer],
  server: 'server/index.js'
}
