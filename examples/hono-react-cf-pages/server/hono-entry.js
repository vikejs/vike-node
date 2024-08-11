import { Hono } from 'hono'
import vike from 'vike-node/hono'

const app = new Hono()
app.use(vike())
export default app
