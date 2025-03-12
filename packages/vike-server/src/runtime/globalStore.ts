import type { ViteDevServer } from 'vite'

// @ts-expect-error
// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
export const globalStore = (globalThis.__vikeNode ||= {}) as {
  viteDevServer?: ViteDevServer;
};
