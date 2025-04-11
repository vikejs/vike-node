import { Hono } from 'hono'
import { apply, serve } from './dist/hono.js'

function startServer() {
  const app = new Hono()
  apply(app)

  const port = process.env.PORT || 3000

  return serve(app, {
    port: +port
  })
}

export default startServer()
