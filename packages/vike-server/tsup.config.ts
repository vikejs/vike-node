import { defineConfig } from 'tsup'
import { builtinModules } from 'node:module'

const externalServers: string[] = ['elysia', 'fastify', 'h3', 'hono']

export default defineConfig([
  {
    entry: {
      // Universal Middlewares and Handler
      universal: './src/handlers/universal-prod.ts',
      'universal.dev': './src/handlers/universal-dev.ts',
      'universal.edge': './src/handlers/universal-prod.edge.ts',
      // apply (node)
      elysia: './src/handlers/adapters/node/elysia.ts',
      express: './src/handlers/adapters/node/express.ts',
      fastify: './src/handlers/adapters/node/fastify.ts',
      h3: './src/handlers/adapters/node/h3.ts',
      hattip: './src/handlers/adapters/node/hattip.ts',
      hono: './src/handlers/adapters/node/hono.ts',
      // apply (dev)
      'elysia.dev': './src/handlers/adapters/dev/elysia.ts',
      'express.dev': './src/handlers/adapters/dev/express.ts',
      'fastify.dev': './src/handlers/adapters/dev/fastify.ts',
      'h3.dev': './src/handlers/adapters/dev/h3.ts',
      'hattip.dev': './src/handlers/adapters/dev/hattip.ts',
      'hono.dev': './src/handlers/adapters/dev/hono.ts',
      // apply (edge)
      'elysia.edge': './src/handlers/adapters/edge/elysia.ts',
      'h3.edge': './src/handlers/adapters/edge/h3.ts',
      'hattip.edge': './src/handlers/adapters/edge/hattip.ts',
      'hono.edge': './src/handlers/adapters/edge/hono.ts',
      // serve (noop)
      'elysia/serve': './src/handlers/adapters/serve/elysia.ts',
      'express/serve': './src/handlers/adapters/serve/express.ts',
      'fastify/serve': './src/handlers/adapters/serve/fastify.ts',
      'h3/serve': './src/handlers/adapters/serve/h3.ts',
      'hattip/serve': './src/handlers/adapters/serve/hattip.ts',
      'hono/serve': './src/handlers/adapters/serve/hono.ts',
      // serve (bun)
      'elysia/serve.bun': './src/handlers/adapters/serve/bun/elysia.ts',
      'h3/serve.bun': './src/handlers/adapters/serve/bun/h3.ts',
      'hattip/serve.bun': './src/handlers/adapters/serve/bun/hattip.ts',
      'hono/serve.bun': './src/handlers/adapters/serve/bun/hono.ts',
      // serve (deno)
      'elysia/serve.deno': './src/handlers/adapters/serve/deno/elysia.ts',
      'h3/serve.deno': './src/handlers/adapters/serve/deno/h3.ts',
      'hattip/serve.deno': './src/handlers/adapters/serve/deno/hattip.ts',
      'hono/serve.deno': './src/handlers/adapters/serve/deno/hono.ts',
      // serve (node)
      'elysia/serve.node': './src/handlers/adapters/serve/node/elysia.ts',
      'express/serve.node': './src/handlers/adapters/serve/node/express.ts',
      'fastify/serve.node': './src/handlers/adapters/serve/node/fastify.ts',
      'h3/serve.node': './src/handlers/adapters/serve/node/h3.ts',
      'hattip/serve.node': './src/handlers/adapters/serve/node/hattip.ts',
      'hono/serve.node': './src/handlers/adapters/serve/node/hono.ts'
    },
    format: ['esm'],
    platform: 'neutral',
    target: 'es2022',
    esbuildOptions(opts) {
      opts.outbase = 'src'
    },
    external: externalServers.concat(...builtinModules.flatMap((e) => [e, `node:${e}`])),
    dts: true,
    outDir: 'dist',
    bundle: true,
    treeshake: true
  },
  {
    entry: {
      config: './src/config.ts',
      plugin: './src/plugin/index.ts',
      api: './src/api.ts',
      index: './src/index.ts'
    },
    format: ['esm'],
    platform: 'node',
    target: 'es2022',
    esbuildOptions(opts) {
      opts.outbase = 'src'
    },
    dts: true,
    outDir: 'dist',
    treeshake: true
  }
])
