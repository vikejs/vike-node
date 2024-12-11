import type { IncomingMessage } from 'http'
import type { ViteDevServer } from 'vite'

// @ts-expect-error
export const globalStore = (globalThis.__vikeNode ||= {
  isDev: false,
  // This is overridden in devServerPlugin
  // in production it's a no-op
  setupHMRProxy: () => {}
}) as {
  isDev: boolean
  viteDevServer?: ViteDevServer
  setupHMRProxy: (req: IncomingMessage) => boolean
}
