import { apply, serve } from '@photonjs/core/express'
import express from 'express'

startServer()

function startServer() {
  const app = express()
  apply(app)
  const port = process.env.PORT || 3000

  return serve(app, { port })
}
