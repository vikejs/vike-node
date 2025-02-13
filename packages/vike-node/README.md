<!-- WARNING: keep links absolute in this file so they work on NPM too -->

[![npm version](https://img.shields.io/npm/v/vike-node)](https://www.npmjs.com/package/vike-node)

# `vike-node`

> [!WARNING]
> This package is in **beta** and will have relatively frequent breaking changes.

Server integration for Vike.

With this extension, your server is transpiled with Vite. So that you don't need `ts-node`/`tsx` anymore.

In development, the server process is restarted when a change is detected.

[Installation](#installation)  
[Custom `pageContext`](#custom-pagecontext)  
[Standalone build](#standalone-build)  
[Compression](#compression)  
[Version history](https://github.com/vikejs/vike-node/blob/main/CHANGELOG.md)  

<br/>


## Installation

[Overview](#overview)  
[Add to existing server](#add-to-existing-server)  
[Supported servers](#supported-servers)  

### Overview

Example of adding `vike-node` and Express.js to a Vike app that doesn't use a server yet.

> [!NOTE]
> - See [Add to existing server](#add-to-existing-server) if you already have a server.
> - See [Supported servers](#supported-servers) for installing `vike-node` with a server other than Express.js.

1. `npm install vike-node express`
1. Extend `vite.config.js`:
   ```js
   // vite.config.js

   import vikeNode from 'vike-node/plugin'

   export default {
     // ...
     plugins: [vikeNode('server/index.js')]
   }
   ```
1. Create `server/index.js`:
   ```js
   // server/index.js

   import express from 'express'
   import vike from 'vike-node/express'

   startServer()

   function startServer() {
     const app = express()
     app.use(vike())
     const port = 3000
     app.listen(port, () => console.log(`Server running at http://localhost:${port}`))
   }
   ```
1. Add production `script`:
   ```diff
     // package.json

     "scripts": {
       "dev": "vike",
       "build": "vike build",
   +   "prod": "NODE_ENV=production node dist/server/index.mjs"
     }
   ```

### Add to existing server

If you already have a server:

```diff
// server/index.js

- import { renderPage } from 'vike/server'
+ import vike from 'vike-node/express'

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

+ app.use(vike())
```

```diff
  // package.json

  "scripts": {
    "build": "vike build",
-   "dev": "node ./server/index.js",
+   "dev": "vite",
-   "prod": "NODE_ENV=production node ./server/index.js"
+   "prod": "NODE_ENV=production node dist/server/index.mjs"
  }
```

### Supported servers

`vike-node` includes middlewares for all commonly used server frameworks.

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
import vike from 'vike-node/express'

startServer()

function startServer() {
  const app = express()
  app.use(vike())
  const port = 3000
  app.listen(port, () => console.log(`Server running at http://localhost:${port}`))
}
```

#### Fastify

```js
// server/index.js

import fastify from 'fastify'
import vike from 'vike-node/fastify'

startServer()

function startServer() {
  const app = fastify()
  app.all('/*', vike())
  const port = 3000
  app.listen({ port }, () => console.log(`Server running at http://localhost:${port}`))
}
```

#### Hono

```js
// server/index.js

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import vike from 'vike-node/hono'

startServer()

function startServer() {
  const app = new Hono()
  app.use(vike())
  const port = 3000
  serve(
    {
      fetch: app.fetch,
      port
    },
    () => console.log(`Server running at http://localhost:${port}`)
  )
}
```

#### H3

```js
// server/index.js

import { createApp, toNodeListener } from 'h3'
import { createServer } from 'http'
import vike from 'vike-node/h3'

startServer()

async function startServer() {
  const app = createApp()
  app.use(vike())
  const port = 3000
  const server = createServer(toNodeListener(app)).listen(port)
  server.on('listening', () => {
    console.log(`Server running at http://localhost:${port}`)
  })
}
```

#### Elysia

```js
// server/index.js

import { Elysia } from 'elysia'
import vike from 'vike-node/elysia'

startServer()

function startServer() {
  const app = new Elysia()
  app.get('/*', vike())
  const port = 3000
  app.listen(port, () => console.log(`Server running at http://localhost:${port}`))
}
```

<br/>

## Custom `pageContext`:

You can define custom [pageContext](https://vike.dev/pageContext) properties:

```ts
import { type RuntimeAdapter } from 'vike-node/express';

app.use(
  vike({
    pageContext(runtime: RuntimeAdapter) {
      return {
        user: runtime.req.user
      }
    }
  })
)
```

> [!NOTE]
> See [`RuntimeAdapter`](https://universal-middleware.dev/reference/runtime-adapter) (`vike-node` uses [universal-middleware](https://universal-middleware.dev/) under the hood).

> [!NOTE]
> The `runtime` object is also available at `pageContext.runtime` so that, even without the custom `pageContext` function above,
> you can retrieve `pageContext.runtime.req.user` in Vike hooks and UI components (with [`usePageContext()`](https://vike.dev/usePageContext)).

<br/>

## Standalone build

With `standalone: true`, the build output directory ([`dist/`](https://vite.dev/config/build-options.html#build-outdir)) contains everything needed for deployment. This means that, in production, only `dist/` is required (i.e. you can remove `node_modules/` and skip `npm install`).

```js
// vite.config.js

import vikeNode from 'vike-node/plugin'

export default {
  plugins: [
    vikeNode({
      entry: 'server/index.js',
      standalone: true
    })
  ]
}
```

Options:

```js
vikeNode({
  standalone: true,
  external: ['my-rust-package']
})
```

### `external`

If an npm package uses native binaries / custom assets then it needs to be added to `external`. (Its assets will then be copied to `dist/`.)

> [!NOTE]
> The following are `external` by default:
> - `sharp`
> - `@prisma/client`
> - `@node-rs/*`
>
> PR welcome to add other packages known to have a native dependency.

<br/>


## Compression

In production, `vike-node` compresses all Vike responses.

You can disable it:

```js
app.use(
  vike({
    compress: false
  })
)
```
