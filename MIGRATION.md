## Migration from `vike-node`

### Vike extension syntax
Replace `vike-node` Vite plugin by `vike-server` Vike extension:

#### `vite.config.ts`
```diff
+import vike from 'vike/plugin'
-import vikeNode from 'vike-node/plugin'

export default {
  // ...
-  plugins: [vikeNode('server/index.js')]
+  plugins: [vike()]
}
```

#### `+config.ts`
```diff
+import vikeServer from 'vike-server/config'

export const config = {
  // ...
+  extends: [vikeServer],
+  server: 'server/index.js'
}
```

### Server entry
Example with a server entry using `express`:

```diff
// server/index.js
-import vike from 'vike-node/express'
+import { apply } from 'vike-server/express'
+import { serve } from 'vike-server/express/serve'

-startServer()

function startServer() {
  const app = express()
-  app.use(vike())
+  apply(app)
  const port = process.env.PORT || 3000

-  app.listen(port, () => console.log(`Server running at http://localhost:${port}`))
+  return serve(app, { port })
}

+export default startServer()
```

### `external` config
`vike-node`'s `external` config as been removed, but can be replaced by the following Vite config:
```js
// vite.config.ts
export default {
  // ...
  resolve: {
    external: [...]
  },
}
```

When used with in `standalone` mode, `+config.ts` also needs to be updated:
```ts
// +config.ts

export const config = {
  // ...
  server: {
    standalone: {
      external: [...]
    }
  }
}
```

### Cloudflare support
TODO

### Vercel support
TODO
