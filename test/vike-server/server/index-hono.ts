import { Hono } from 'hono'
import { apply } from 'vike-server/hono'
import { serve } from 'vike-server/hono/serve'
import { init } from '../database/todoItems'

async function startServer() {
  await init();
  const app = new Hono<{
    Variables: {
      xRuntime: string;
    };
  }>();
  const port = process.env.PORT || 3000;

  app.use("*", async (ctx, next) => {
    ctx.set("xRuntime", "x-guy-1");
    await next();
    ctx.header("x-test", "test");
  });

  apply(app, {
    pageContext(runtime) {
      return {
        xRuntime: runtime.hono.get("xRuntime"),
      };
    },
  });

  return serve(app, { port: +port });
}

export default startServer();
