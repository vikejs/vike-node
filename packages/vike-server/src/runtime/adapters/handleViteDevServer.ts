export { handleViteDevServer };
import type { IncomingMessage, ServerResponse } from 'node:http'
import { assert } from '../../utils/assert.js'
import { globalStore } from '../globalStore.js'

/**
 * If vite dev server returns a response, we need to forward it to our actual server
 */
function handleViteDevServer(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    res.once("close", () => {
      resolve(true);
    });
    assert(globalStore.viteDevServer);
    globalStore.viteDevServer.middlewares(req, res, () => {
      resolve(false);
    });
  });
}
