import type { apply as applyAdapter } from '@universal-middleware/hono'
import { serve as honoServe } from '@hono/node-server'
import { onReady, type ServerOptions } from '../../../serve.js'
import type { Socket } from 'node:net'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  const server = honoServe(
    {
      fetch: app.fetch,
      port: options.port,
      overrideGlobalObjects: false,
    },
    onReady(options),
  );

  const connections: Set<Socket> = new Set();

  server.on("connection", (conn: Socket) => {
    connections.add(conn);
    conn.on("close", () => {
      connections.delete(conn);
    });
  });

  const destroy = (cb: () => void) => {
    server.close(cb);
    // biome-ignore lint/complexity/noForEach: <explanation>
    connections.forEach((c) => c.destroy());
  };

  if (import.meta.hot) {
    const callback = () => {
      import.meta.hot?.off("vike-server:close-server", callback);
      console.log("received", "vike-server:close-server");
      destroy(() => {
        console.log("CLOSED");
        import.meta.hot?.send("vike-server:server-closed");
      });
    };
    import.meta.hot.on("vike-server:close-server", callback);
  }

  return app;
}
