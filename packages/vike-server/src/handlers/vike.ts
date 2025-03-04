import { enhance, type Get, type UniversalHandler } from '@universal-middleware/core'
import vikeUniversalHandler from 'vike/universal-middleware'
import type { VikeOptions } from '../runtime/types.js'

export const renderPageHandler = ((options?) =>
  enhance(
    async (request, context, runtime) => {
      const pageContextInit = { ...context, runtime, urlOriginal: request.url, headersOriginal: request.headers };

      if (typeof options?.pageContext === "function") {
        Object.assign(pageContextInit, await options.pageContext(runtime));
      } else if (options?.pageContext) {
        Object.assign(pageContextInit, options.pageContext);
      }

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      return vikeUniversalHandler(request, pageContextInit, runtime as any);
    },
    {
      name: "vike",
      path: "/**",
      method: "GET",
      order: 0,
      immutable: false,
    },
  )) satisfies Get<[options: VikeOptions], UniversalHandler>;
