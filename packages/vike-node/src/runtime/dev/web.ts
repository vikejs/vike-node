import type { IncomingMessage, ServerResponse } from 'node:http'
import { assert } from '../../utils/assert.js'
import { connectToWeb } from '../adapters/connectToWeb.js'
import { globalStore } from '../globalStore.js'

export const web = connectToWeb(handleViteDevServer)

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