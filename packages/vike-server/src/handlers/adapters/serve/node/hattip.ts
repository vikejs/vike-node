import type { apply as applyAdapter } from '@universal-middleware/hattip'
import { createServer } from '@hattip/adapter-node'
import { installServerHMR, onReady, type ServerOptions } from '../../../serve.js'

export function serve<App extends Parameters<typeof applyAdapter>[0]>(app: App, options: ServerOptions) {
  const handler = app.buildHandler();
  const server = createServer(handler).listen(options.port, onReady(options));

  if (import.meta.hot) {
    installServerHMR(server);
  }

  return handler;
}
