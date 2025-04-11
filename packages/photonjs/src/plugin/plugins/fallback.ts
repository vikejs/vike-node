import type { Plugin } from 'vite'

export { fallback }

function fallback(): Plugin {
  return {
    name: 'photonjs:fallback',

    resolveId(id) {
      if (id === 'photonjs:fallback-entry') {
        return id
      }
    },

    load(id) {
      if (id === 'photonjs:fallback-entry') {
        //language=ts
        return `import { apply, serve } from '@photonjs/core/hono'
import { Hono } from 'hono'

function startServer() {
  const app = new Hono()
  apply(app)

  const port = process.env.PORT || 3000

  return serve(app, {
    port: +port
  })
}

export default startServer()
`
      }
    }
  }
}
