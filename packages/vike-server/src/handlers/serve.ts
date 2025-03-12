export interface ServerOptions {
  port: number;
  bun?: Omit<Parameters<typeof Bun.serve>[0], "fetch" | "port">;
  deno?: Omit<Deno.ServeTcpOptions, "port" | "handler">;
}
type Handler = (req: Request) => Response | Promise<Response>;

export function onReady(options: { port: number }) {
  return () => {
    if (import.meta.hot) {
      if (import.meta.hot.data.vikeServerStarted) {
        import.meta.hot.send("vike-server:reloaded");
        return;
      }
      import.meta.hot.data.vikeServerStarted = true;
    }
    console.log(`Server running at http://localhost:${options.port}`);
  };
}

export function denoServe(options: ServerOptions, handler: Handler) {
  Deno.serve({ ...options.deno, port: options.port, onListen: onReady(options) }, handler);
}

export function bunServe(options: ServerOptions, handler: Handler) {
  Bun.serve({ ...options.bun, port: options.port, fetch: handler });
  onReady(options)();
}
