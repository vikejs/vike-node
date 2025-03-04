import { Elysia } from 'elysia'
import { apply } from 'vike-server/elysia'
import { init } from '../database/todoItems'

startServer()

async function startServer() {
  await init()
  const app = new Elysia().state('xRuntime', 'x-runtime')

  const port = process.env.PORT || 3000

  app.onAfterHandle((ctx) => {
    ctx.set.headers['x-test'] = 'test'
  })

  apply(app, {
    pageContext(runtime) {
      return {
        xRuntime: (runtime.elysia.store as { xRuntime: string }).xRuntime
      }
    }
  })

  app.listen(+port, () => console.log(`Server running at http://localhost:${port}`))
}
