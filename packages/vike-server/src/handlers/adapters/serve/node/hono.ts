import type { apply as applyAdapter } from '@universal-middleware/hono'
import { serve as honoServe } from '@hono/node-server'
import { onReady, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  const server = honoServe(
    {
      fetch: app.fetch,
      port: options.port,
      overrideGlobalObjects: false,
    },
    onReady(options),
  );

  if (import.meta.hot) {
    const callback = () => {
      import.meta.hot?.off("vike-server:close-server", callback);
      console.log("received", "vike-server:close-server");
      server.close(() => {
        import.meta.hot?.send("vike-server:server-closed");
      });
    };
    import.meta.hot.on("vike-server:close-server", callback);
  }

  return app;
}
