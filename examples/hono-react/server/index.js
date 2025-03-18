import { Hono } from 'hono'
import { apply } from 'vike-server/hono'
import { serve } from 'vike-server/hono/serve'

startServer()

function startServer() {
  const app = new Hono()
  apply(app)
  const port = process.env.PORT || 3000

  return serve(app, { port })
}
