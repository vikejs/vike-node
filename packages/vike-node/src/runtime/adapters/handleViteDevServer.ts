export { handleViteDevServer }
import type { IncomingMessage, ServerResponse } from 'node:http'
import { assert } from '../../utils/assert.js'
import { globalStore } from '../globalStore.js'

function handleViteDevServer(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    res.once('close', () => {
      resolve(true)
    })
    assert(globalStore.viteDevServer)
    globalStore.viteDevServer.middlewares(req, res, () => {
      resolve(false)
    })
  })
}
