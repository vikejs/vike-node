import { serve } from '@photonjs/core/elysia/serve'
import { Elysia } from 'elysia'
import { apply, type RuntimeAdapter } from 'vike-server/elysia'
import { init } from '../database/todoItems'

async function startServer() {
  await init()
  const app = new Elysia().state('xRuntime', 'x-runtime')

  const port = process.env.PORT || 3000

  app.onAfterHandle((ctx) => {
    ctx.set.headers['x-test'] = 'test'
  })

  apply(app, {
    pageContext(runtime: RuntimeAdapter) {
      return {
        xRuntime: (runtime.elysia.store as { xRuntime: string }).xRuntime
      }
    }
  })

  return serve(app, {
    port: +port,
    onReady() {
      console.log(`Server running at http://localhost:${port}`)
      console.log('HOOK CALLED: onReady')
    }
  })
}

export default startServer()
