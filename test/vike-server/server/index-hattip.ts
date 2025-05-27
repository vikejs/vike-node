import type { Server } from 'node:http'
import { createRouter, type RouterContext } from '@hattip/router'
import { apply, serve } from '@photonjs/core/hattip'
import { getMiddlewares } from 'vike-server/universal-middlewares'
import { init } from '../database/todoItems'

declare module '@hattip/compose' {
  interface Locals {
    xRuntime: string
  }
}

async function startServer() {
  await init()
  const app = createRouter()
  const port = process.env.PORT || 3000

  app.use('*', async (ctx) => {
    ctx.locals.xRuntime = 'x-runtime'
    const response = await ctx.next()
    response.headers.set('x-test', 'test')
    return response
  })

  apply(
    app,
    getMiddlewares<'hattip'>({
      pageContext(runtime) {
        return {
          xRuntime: (runtime.hattip as RouterContext).locals.xRuntime
        }
      }
    })
  )

  return serve(app, {
    port: +port,
    onReady() {
      console.log(`Server running at http://localhost:${port}`)
      console.log('HOOK CALLED: onReady')
    },
    onCreate(server?: Server) {
      console.log('HOOK CALLED: onCreate:', server?.constructor.name)
    }
  })
}

export default await startServer()
