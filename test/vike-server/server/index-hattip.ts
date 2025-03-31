import { createRouter, type RouterContext } from '@hattip/router'
import { apply } from 'vike-server/hattip'
import { serve } from 'vike-server/hattip/serve'
import { init } from '../database/todoItems'
import type { Server } from 'node:http'

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

  apply(app, {
    pageContext(runtime) {
      return {
        xRuntime: (runtime.hattip as RouterContext).locals.xRuntime
      }
    }
  })

  return serve(app, {
    port: +port,
    onServer(server?: Server) {
      console.log('Server:', server?.constructor.name)
    }
  })
}

export default startServer()
