// import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import vike from 'vike-node/hono'

export default startServer()

function startServer() {
  const app = new Hono()
  app.use(vike())
  // const port = process.env.PORT || 3000
  // serve(
  //   {
  //     fetch: app.fetch,
  //     port: +port,
  //     // Needed for Bun
  //     overrideGlobalObjects: false
  //   },
  //   () => console.log(`Server running at http://localhost:${port}`)
  // )
  return app.fetch
}
