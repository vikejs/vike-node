import express from 'express'
import { apply } from 'vike-server/express'

export default startServer()

function startServer() {
  const app = express()
  apply(app)
  const port = process.env.PORT || 3000
  app.listen(port, () => console.log(`Server running at http://localhost:${port}`))
  return app
}
