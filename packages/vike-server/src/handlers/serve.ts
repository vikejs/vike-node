import type { Server } from 'node:http'
import type { Http2SecureServer, Http2Server } from 'node:http2'
import type { Socket } from 'node:net'

export interface ServerOptions {
  port: number
  bun?: Omit<Parameters<typeof Bun.serve>[0], 'fetch' | 'port'>
  deno?: Omit<Deno.ServeTcpOptions | (Deno.ServeTcpOptions & Deno.TlsCertifiedKeyPem), 'port' | 'handler'>
}
type Handler = (req: Request) => Response | Promise<Response>

export function onReady(options: { port: number; isHttps?: boolean }) {
  return () => {
    if (import.meta.hot) {
      if (import.meta.hot.data.vikeServerStarted) {
        import.meta.hot.send('vike-server:reloaded')
        return
      }
      import.meta.hot.data.vikeServerStarted = true
    }
    console.log(`Server running at ${options.isHttps ? 'https' : 'http'}://localhost:${options.port}`)
  }
}

export function denoServe(options: ServerOptions, handler: Handler) {
  const denoOptions = options.deno ?? {}
  const isHttps = 'cert' in denoOptions ? Boolean(denoOptions.cert) : false
  Deno.serve({ ...denoOptions, port: options.port, onListen: onReady({ isHttps, ...options }) }, handler)
}

export function bunServe(options: ServerOptions, handler: Handler) {
  const bunOptions = options.bun ?? {}
  const isHttps = 'tls' in bunOptions ? Boolean(bunOptions.tls) : false
  Bun.serve({ ...options.bun, port: options.port, fetch: handler })
  onReady({ isHttps, ...options })()
}

/**
 * server.close() does not close existing connections.
 * The returned function forces all connections to close while closing the server.
 */
function onServerClose(server: Server | Http2Server | Http2SecureServer) {
  const connections: Set<Socket> = new Set()

  server.on('connection', (conn: Socket) => {
    connections.add(conn)
    conn.on('close', () => {
      connections.delete(conn)
    })
  })

  // biome-ignore lint/complexity/noForEach: <explanation>
  const closeAllConnections = () => connections.forEach((c) => c.destroy())

  return function destroy(cb: () => void) {
    server.close(cb)
    closeAllConnections()
  }
}

function _installServerHMR(server: Server | Http2Server | Http2SecureServer) {
  if (import.meta.hot) {
    const destroy = onServerClose(server)

    return new Promise<void>((resolve) => {
      const callback = () => {
        destroy(() => {
          resolve()
          // Signal that the server is properly closed, so that we can continue the hot-reload process
          import.meta.hot?.send('vike-server:server-closed')
        })
      }

      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      import.meta.hot!.on('vite:beforeFullReload', callback)

      // Sent when vite server restarts
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      import.meta.hot!.on('vike-server:close-server', callback)
    })
  }
}

export function installServerHMR(serve: () => Server | Http2Server | Http2SecureServer) {
  // biome-ignore lint/style/noNonNullAssertion: asserted by wrapping function, and e2e tested
  const previousServerClosing: Promise<void> = import.meta.hot!.data.previousServerClosing ?? Promise.resolve()

  previousServerClosing.then(() => {
    const server = serve()
    // biome-ignore lint/style/noNonNullAssertion: asserted by wrapping function, and e2e tested
    import.meta.hot!.data.previousServerClosing = _installServerHMR(server)
  })
}
