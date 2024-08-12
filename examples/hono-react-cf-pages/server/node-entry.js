import { serve } from '@hono/node-server'
import app from './app.js'

startServer()

function startServer() {
  const port = process.env.PORT || 3000
  serve(
    {
      fetch: app.fetch,
      port: +port,
      // Needed for Bun
      overrideGlobalObjects: false
    },
    () => console.log(`Server running at http://localhost:${port}`)
  )
}
