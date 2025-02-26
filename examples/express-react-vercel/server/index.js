import express from 'express'
import vike from 'vike-server/express'

export default startServer()

function startServer() {
  const app = express()
  app.use(vike())
  const port = process.env.PORT || 3000
  app.listen(port, () => console.log(`Server running at http://localhost:${port}`))
  return app
}
