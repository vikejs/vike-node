<!-- WARNING: keep links absolute in this file so they work on NPM too -->

[<img src="https://vike.dev/vike-readme.svg" align="right" height="90">](https://vike.dev)
[![npm version](https://img.shields.io/npm/v/vike-node)](https://www.npmjs.com/package/vike-node)

# `vike-node`

Server integration for Vike.

With this extension, your server code is transpiled with Vite.

In development, the server process is restarted when a change is detected in some of your server files.

[Installation](#installation)  
[Standalone build](#standalone-build)  
[External packages](#external-packages)  
[Compression](#compression)  
[Custom pageContext](#custom-pagecontext)  
[Add to existing app](#add-to-existing-app)  

<br/>

## Installation

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
   > If you already have a server, see [Add to existing app](#add-to-existing-app).

## Standalone build

You can enable standalone builds by setting `standalone` to `true`.
<br>
After build, the output `dist` folder will contain everything for a deployment.
<br>
With standalone mode, the production environment only needs the `dist` folder to be present.
<br>
Example start script: `NODE_ENV=production node dist/server/index.mjs`

```js
// vite.config.js

import vikeNode from 'vike-node/plugin'

export default {
  // ...
  plugins: [
    vikeNode({
      entry: 'server/index.js',
      standalone: true
    })
  ]
}
```

## External packages

Packages that import native binaries/custom assets need to be added to `external`.<br>
When building with `standalone` enabled, `external` packages and their assets are copied to the output `dist` directory.<br>
By default, the `external` setting includes:

- `sharp`
- `@prisma/client`
- `@node-rs/*`

```js
// vite.config.js

import vikeNode from 'vike-node/plugin'

export default {
  // ...
  plugins: [
    vikeNode({
      entry: 'server/index.js',
      standalone: true,
      external: ['my-rust-package']
    })
  ]
}
```

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

## Custom [pageContext](https://vike.dev/pageContext)

`vike-node` uses [universal-middleware](https://universal-middleware.dev/) and automatically adds the universal context to `pageContext`.

If you need custom properties to be available in `pageContext`,
you can [create a universal context middleware](https://universal-middleware.dev/recipes/context-middleware#updating-the-context) and attach it to your server.

## Framework examples

`vike-node` includes middlewares for the most popular web frameworks:

- Express
- Fastify
- Hono
- H3
- Elysia (Bun)

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

#### Elysia (Bun)

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

## Add to existing app

To add `vike-node` to an existing Vike app:

```diff
// server/index.js

- import { renderPage } from 'vike/server'
+ import { vike } from 'vike-node/express'

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
- "dev": "node ./server",
+ "dev": "vite",
}
```
