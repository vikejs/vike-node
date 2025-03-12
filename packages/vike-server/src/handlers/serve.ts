import type { Server } from 'node:http'
import type { Http2SecureServer, Http2Server } from 'node:http2'
import type { Socket } from 'node:net'

export interface ServerOptions {
  port: number
  bun?: Omit<Parameters<typeof Bun.serve>[0], 'fetch' | 'port'>
  deno?: Omit<Deno.ServeTcpOptions, 'port' | 'handler'>
}
type Handler = (req: Request) => Response | Promise<Response>

export function onReady(options: { port: number }) {
  return () => {
    if (import.meta.hot) {
      if (import.meta.hot.data.vikeServerStarted) {
        import.meta.hot.send('vike-server:reloaded')
        return
      }
      import.meta.hot.data.vikeServerStarted = true
    }
    console.log(`Server running at http://localhost:${options.port}`)
  }
}

export function denoServe(options: ServerOptions, handler: Handler) {
  Deno.serve({ ...options.deno, port: options.port, onListen: onReady(options) }, handler)
}

export function bunServe(options: ServerOptions, handler: Handler) {
  Bun.serve({ ...options.bun, port: options.port, fetch: handler })
  onReady(options)()
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

  return function destroy(cb: () => void) {
    server.close(cb)
    // biome-ignore lint/complexity/noForEach: <explanation>
    connections.forEach((c) => c.destroy())
  }
}

export function installServerHMR(server: Server | Http2Server | Http2SecureServer) {
  if (import.meta.hot) {
    const destroy = onServerClose(server)

    const callback = () => {
      import.meta.hot?.off('vike-server:close-server', callback)
      destroy(() => {
        import.meta.hot?.send('vike-server:server-closed')
      })
    }
    import.meta.hot.on('vike-server:close-server', callback)
  }
}
