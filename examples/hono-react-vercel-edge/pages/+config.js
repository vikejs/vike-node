export { config }

import vikeReact from 'vike-react/config'

const config = {
  // https://vike.dev/extends
  extends: vikeReact,
  prerender: false,
  // set to "web" after https://github.com/vikejs/vike/pull/1799 is merged
  stream: false
}
