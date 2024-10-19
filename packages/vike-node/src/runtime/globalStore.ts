import type { IncomingMessage } from 'node:http'
import type { ViteDevServer } from 'vite'

// @ts-expect-error
export const globalStore = (globalThis.__vikeNode ||= {
  isPluginLoaded: false,
  // This is overridden in devServerPlugin
  // in production it's a no-op
  setupHMRProxy: () => {}
}) as {
  isPluginLoaded: boolean
  viteDevServer?: ViteDevServer
  setupHMRProxy: (req: IncomingMessage) => void
}
