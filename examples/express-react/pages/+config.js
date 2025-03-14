export { config }

import vikeReact from 'vike-react/config'
import vikeServer from 'vike-server/config'
import { Layout } from './Layout'

const config = {
  // https://vike.dev/Layout
  Layout: Layout,
  // https://vike.dev/extends
  extends: [vikeReact, vikeServer],
  server: 'server/index.js'
}
