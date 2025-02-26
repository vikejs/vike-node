import type { IncomingMessage } from 'node:http'
import type { ViteDevServer } from 'vite'

// @ts-expect-error
// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
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
