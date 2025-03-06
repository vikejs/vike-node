export interface ServerOptions {
  port: number
  bun?: Omit<Parameters<typeof Bun.serve>[0], 'fetch' | 'port'>
  deno?: Omit<Deno.ServeTcpOptions, 'port' | 'handler'>
}
export type Serve<App> = (options: ServerOptions) => App
export type ApplyReturn<App> = { serve: Serve<App> }
type Handler = (req: Request) => Response | Promise<Response>

export function onReady(options: { port: number }) {
  return () => console.log(`Server running at http://localhost:${options.port}`)
}

export function denoServe(options: ServerOptions, handler: Handler) {
  Deno.serve({ ...options.deno, port: options.port, onListen: onReady(options) }, handler)
}

export function bunServe(options: ServerOptions, handler: Handler) {
  Bun.serve({ ...options.bun, port: options.port, fetch: handler })
  onReady(options)()
}

export function commonRuntimes(options: ServerOptions, handler: Handler) {
  switch (__VIKE_RUNTIME__) {
    case 'deno':
      denoServe(options, handler)
      break
    case 'bun':
      bunServe(options, handler)
      break
  }
}

export function commonRuntimesNode(runtime: string) {
  switch (__VIKE_RUNTIME__) {
    case 'deno':
      throw new Error(`${runtime} is not compatible with Deno. Use another server like Hono or use NodeJS.`)
    case 'bun':
      throw new Error(`${runtime} is not compatible with Bun. Use another server like Hono or use NodeJS.`)
  }
}
