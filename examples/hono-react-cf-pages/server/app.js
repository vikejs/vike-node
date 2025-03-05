import { Hono } from 'hono'
import { apply } from 'vike-server/hono'
import { config, telefunc } from 'telefunc'

config.disableNamingConvention = true

const app = new Hono()
app.post('_telefunc', async (ctx) => {
  const { url, method } = ctx.req
  const body = await ctx.req.text()
  const httpResponse = await telefunc({ url, method, body })
  return new Response(httpResponse.body, {
    status: httpResponse.statusCode
  })
})
apply(app)
export default app
