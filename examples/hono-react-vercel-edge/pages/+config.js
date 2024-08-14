export { config }

import vikeReact from 'vike-react/config'
import vercel from '@vite-plugin-vercel/vike/config'

const config = {
  // https://vike.dev/extends
  extends: [vikeReact, vercel],
  stream: false
}
