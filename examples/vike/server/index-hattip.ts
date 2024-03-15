import { telefunc } from 'telefunc'
import { vike } from 'vike-node/web'
import { init } from '../database/todoItems.js'
import { createServer } from '@hattip/adapter-node'

startServer()

async function startServer() {
  await init()
  // app.all('/_telefunc', async (req, res) => {
  //   const context = {}
  //   const httpResponse = await telefunc({ url: req.originalUrl, method: req.method, body: req.body as string, context })
  //   const { body, statusCode, contentType } = httpResponse
  //   res.status(statusCode).type(contentType).send(body)
  // })

  const server = createServer(async (ctx) => {
    const res = await vike({
      url: ctx.platform.request.url!,
      headers: ctx.request.headers
    })
    if (!res) return new Response('Not Found', { status: 404 })
    return new Response(res.stream, {
      status: res.status,
      headers: res.headers
    })
  })
  const port = process.env.PORT || 3000
  server.listen(+port)
  console.log(`Server running at http://localhost:${port}`)
}

// entry-node.js
