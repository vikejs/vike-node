import { telefunc } from 'telefunc'
import { App, type HttpResponse } from 'uWebSockets.js'
import vike from 'vike-node/uws'
import { init } from '../database/todoItems'

const getBodyJson = (res: HttpResponse): Promise<string> => {
  return new Promise((resolve, reject) => {
    let data = Buffer.from('')
    res.onData((chunk, isLast) => {
      data = Buffer.concat([data, Buffer.from(chunk)])
      if (isLast) {
        try {
          resolve(data.toString())
        } catch (error) {
          reject(error)
        }
      }
    })
  })
}

startServer()

async function startServer() {
  await init()
  const app = vike(App())

  app.post('/_telefunc', async (res, req) => {
    const context = {}
    const httpResponse = await telefunc({
      url: req.getUrl(),
      method: req.getMethod(),
      body: await getBodyJson(res),
      context
    })
    res.writeStatus(httpResponse.statusCode + '')
    res.writeHeader('content-type', httpResponse.contentType)
    res.end(httpResponse.body)
  })

  // TODO
  // res.writeHeader('x-test', 'test')

  const port = process.env.PORT || 3000
  await new Promise<void>((resolve, reject) => {
    app.listen(+port, (listenSocket) => {
      if (listenSocket) {
        console.log(`Server running at http://localhost:${port}`)
        resolve()
      } else {
        reject(`Failed to listen to port ${port}`)
      }
    })
  })
}
