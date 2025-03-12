import type { Get, UniversalMiddleware } from '@universal-middleware/core'
import { handleViteDevServer } from '../runtime/adapters/handleViteDevServer.js'
import { connectToWeb } from '@universal-middleware/express'

export const devServerMiddleware = (() => async (request, context, runtime) => {
  const handled = await connectToWeb(handleViteDevServer)(request, context, runtime);

  if (handled) return handled;

  return (response) => {
    if (!response.headers.has("ETag")) {
      response.headers.set("Cache-Control", "no-store");
    }
    return response;
  };
}) satisfies Get<[], UniversalMiddleware>;
