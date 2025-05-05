import { apply, serve } from '@photonjs/core/express'
import express from 'express'

function startServer() {
  const app = express()
  apply(app)
  const port = process.env.PORT || 3000

  return serve(app, { port })
}

export default startServer()
