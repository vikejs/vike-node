import { type Get, pipeRoute, type RuntimeAdapter, type UniversalMiddleware } from '@universal-middleware/core'
import type { VikeOptions } from '../runtime/types.js'
import { renderPageHandler } from './vike.js'
import { getGlobalContextAsync } from 'vike/server' // https://vike.dev/pageContext#typescript

// https://vike.dev/pageContext#typescript
declare global {
  namespace Vike {
    interface PageContext {
      runtime: RuntimeAdapter;
    }
  }
}

let renderPageUniversal: Get<[options?: VikeOptions], UniversalMiddleware>;

async function getUniversalMiddlewares() {
  const isProduction = process.env.NODE_ENV === "production";
  const globalContext = await getGlobalContextAsync(isProduction);
  return (globalContext.config.middleware?.flat(Number.POSITIVE_INFINITY) ?? []) as UniversalMiddleware[];
}

const vikeMiddlewares = await getUniversalMiddlewares();

if (__DEV__) {
  const { devServerMiddleware } = await import("../middlewares/devServer.js");
  renderPageUniversal = (options?) =>
    pipeRoute([devServerMiddleware(), ...vikeMiddlewares, renderPageHandler(options)], {});
} else {
  const { compressMiddleware } = await import("../middlewares/compress.js");
  const { serveStaticMiddleware } = await import("../middlewares/serveStatic.js");
  renderPageUniversal = (options?) =>
    pipeRoute(
      [compressMiddleware(options), serveStaticMiddleware(options), ...vikeMiddlewares, renderPageHandler(options)],
      {},
    );
}

export default renderPageUniversal;
