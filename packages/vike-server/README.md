<!-- WARNING: keep links absolute in this file so they work on NPM too -->

[![npm version](https://img.shields.io/npm/v/vike-server)](https://www.npmjs.com/package/vike-server)

# `vike-server`

> [!WARNING]
> This package is in **beta** and will have relatively frequent breaking changes.

Server integration for Vike.

The most important feature you unlock:
 - Your server is transpiled with Vite. So that you don't need `ts-node`/`tsx` anymore
 - Seamless deployment on cloud platforms thanks to extensions like `vike-cloudflare` and `vike-vercel`
 - In development, your server supports HMR!


[Installation](#installation)  
[Custom `pageContext`](#custom-pagecontext)  
[Standalone build](#standalone-build)  
[Compression](#compression)  
[Version history](https://github.com/vikejs/vike-server/blob/main/CHANGELOG.md)  

<br/>


## Installation

[Overview](#overview)  
[Add to existing server](#add-to-existing-server)  
[Supported servers](#supported-servers)  

### Overview

Example of adding `vike-server` and Express.js to a Vike app that doesn't use a server yet.

> [!NOTE]
> - See [Add to existing server](#add-to-existing-server) if you already have a server.
> - See [Supported servers](#supported-servers) for installing `vike-server` with a server other than Express.js.

1. `npm install vike-server express`
1. Extend or create [`+config.js`](https://vike.dev/config):
   ```ts
   // +config.js
   
   import vikeServer from 'vike-server/config'

   export const config = {
     // ...
     extends: [vikeServer],
     server: 'server/index.js'
   }
   ```
1. Create `server/index.js`:
   ```js
   // server/index.js
   
   import express from 'express'
   import { apply } from 'vike-server/express'
   import { serve } from 'vike-server/express/serve'

   function startServer() {
     const app = express()
     // Applies Vike's middlewares
     apply(app);
     const port = 3000
     // In dev, runs with specificed port. This also enables HMR
     // In prod, using `serve` ensures compatibility with any build target (like Cloudflare, Vercel, NodeJS, etc.)
     return serve(app, { port })
   }
   
   // Always export default the result of `serve` function
   export default startServer();
   ```
1. Add production `script` in `package.json` (run compiled code with NodeJS):
   ```diff
   // package.json
   
     "scripts": {
       "dev": "vike dev",
       "build": "vike build",
   +   "prod": "NODE_ENV=production node dist/server/index.js"
     }
   ```

### Add to existing server

If you already have a server:

```diff
// server/index.js

- import { renderPage } from 'vike/server'
+ import { apply } from 'vike-server/express'
+ import { serve } from 'vike-server/express/serve'

- if (isProduction) {
-   app.use(express.static(`${root}/dist/client`))
- } else {
-   const vite = await import('vite')
-   const viteDevMiddleware = (
-     await vite.createServer({
-       root,
-       server: { middlewareMode: true }
-     })
-   ).middlewares
-   app.use(viteDevMiddleware)
- }

- app.get('*', async (req, res, next) => {
-   const pageContextInit = {
-     urlOriginal: req.originalUrl
-   }
-   const pageContext = await renderPage(pageContextInit)
-   const { httpResponse } = pageContext
-   if (!httpResponse) {
-     return next()
-   } else {
-     const { statusCode, headers } = httpResponse
-     headers.forEach(([name, value]) => res.setHeader(name, value))
-     res.status(statusCode)
-     httpResponse.pipe(res)
-   }
- })

+ apply(app);
+ export default serve(app, { port: +process.env.PORT || 3000 });
```

```diff
  // package.json

  "scripts": {
    "build": "vike build",
-   "dev": "node ./server/index.js",
+   "dev": "vike dev",
-   "prod": "NODE_ENV=production node ./server/index.js"
+   "prod": "NODE_ENV=production node dist/server/index.js"
  }
```

### Supported servers

`vike-server` supports all commonly used server frameworks.

- [Express](#express)
- [Fastify](#fastify)
- [Hono](#hono)
- [H3](#h3)
- [Elysia](#elysia)

[See complete list of supported servers](https://universal-middleware.dev/reference/supported-adapters).

#### Express

```js
// server/index.js

import express from 'express'
import { apply } from 'vike-server/express'
import { serve } from 'vike-server/express/serve'

function startServer() {
  const app = express()
  apply(app)
  const port = 3000
  return serve(app, { port })
}

export default startServer()
```

#### Fastify

```js
// server/index.js

import fastify from 'fastify'
import { apply } from 'vike-server/fastify'
import { serve } from 'vike-server/fastify/serve'

function startServer() {
  const app = fastify()
  apply(app)
  const port = 3000
  return serve(app, { port })
}

export default startServer()
```

#### Hono

```js
// server/index.js

import { Hono } from 'hono'
import { apply } from 'vike-server/hono'
import { serve } from 'vike-server/hono/serve'

function startServer() {
  const app = new Hono()
  apply(app)
  const port = 3000
  return serve(app, { port })
}

export default startServer()
```

#### H3

```js
// server/index.js

import { createApp, toNodeListener } from 'h3'
import { apply } from 'vike-server/h3'
import { serve } from 'vike-server/h3/serve'

async function startServer() {
  const app = createApp()
  apply(app)
  const port = 3000
  return serve(app, { port })
}

export default startServer()
```

#### Elysia

```js
// server/index.js

import { Elysia } from 'elysia'
import { apply } from 'vike-server/elysia'
import { serve } from 'vike-server/elysia/serve'

function startServer() {
  const app = new Elysia()
  apply(app)
  const port = 3000
  return serve(app, { port })
}

export default startServer()
```

<br/>

## Custom `pageContext`:

You can define custom [pageContext](https://vike.dev/pageContext) properties:

```ts
apply(app, {
  pageContext(runtime) {
    return {
      user: runtime.req.user
    }
  }
})
```

> [!NOTE]
> See [`RuntimeAdapter`](https://universal-middleware.dev/reference/runtime-adapter) (`vike-server` uses [universal-middleware](https://universal-middleware.dev/) under the hood).

> [!NOTE]
> The `runtime` object is also available at `pageContext.runtime` so that, even without the custom `pageContext` function above,
> you can retrieve `pageContext.runtime.req.user` in Vike hooks and UI components (with [`usePageContext()`](https://vike.dev/usePageContext)).

<br/>

## Standalone build (experimental)

With `standalone: true`, the build output directory ([`dist/`](https://vite.dev/config/build-options.html#build-outdir)) contains everything needed for deployment. This means that, in production, only `dist/` is required (i.e. you can remove `node_modules/` and skip `npm install`).

> [!WARNING]
> If the production code built with `standalone: true` fails to run with errors like `ENOENT: no such file or directory`, please disable standalone mode, or replace
> the dependency throwing the error with one that does not rely on filesystem operations.

> [!TIP]
> Instead of using `standalone: true`, we recommend tools like [`pnpm deploy --prod`](https://pnpm.io/cli/deploy).  
> This provides better control over packed files and ensures greater compatibility.

```js
// +config.js

import vikeServer from 'vike-server/config'

export const config = {
  // ...
  extends: [vikeServer],
  server: {
    entry: 'server/index.js',
    standalone: true
  }
}
```

Options:

```js
export const config = {
  // ...
  extends: [vikeServer],
  server: {
    entry: 'server/index.js',
    standalone: {
      esbuild: {
        minify: true,
        // ... or any other esbuild option
      }
    }
  }
}
```

<br/>


## Compression

In production, `vike-server` compresses all Vike responses.

You can disable it:

```js
apply(app, {
  compress: false
})
```
