import { apply, serve } from '@photonjs/core/hono'
import { Hono } from 'hono'

startServer()

function startServer() {
  const app = new Hono()
  apply(app)
  const port = process.env.PORT || 3000

  return serve(app, { port })
}
