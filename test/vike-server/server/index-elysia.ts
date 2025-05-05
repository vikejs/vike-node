import { apply, serve } from '@photonjs/core/elysia'
import { Elysia } from 'elysia'
import { getMiddlewares } from 'vike-server/universal-middlewares'
import { init } from '../database/todoItems'

async function startServer() {
  await init()
  const app = new Elysia().state('xRuntime', 'x-runtime')

  const port = process.env.PORT || 3000

  app.onAfterHandle((ctx) => {
    ctx.set.headers['x-test'] = 'test'
  })

  apply(
    app,
    getMiddlewares<'elysia'>({
      pageContext(runtime) {
        return {
          xRuntime: (runtime.elysia.store as { xRuntime: string }).xRuntime
        }
      }
    })
  )

  return serve(app, {
    port: +port,
    onReady() {
      console.log(`Server running at http://localhost:${port}`)
      console.log('HOOK CALLED: onReady')
    }
  })
}

export default startServer()
