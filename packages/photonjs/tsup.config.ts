import { builtinModules } from 'node:module'
import { defineConfig, type Options as TsupOptions } from 'tsup'
import virtualApply from './src/unplugin/esbuild.js'

const externalServers: (string | RegExp)[] = ['elysia', 'fastify', 'h3', 'hono']

const commonOptions: TsupOptions = {
  format: ['esm'],
  target: 'es2022',
  esbuildOptions(opts) {
    opts.outbase = 'src'
  },
  dts: true,
  outDir: 'dist',
  treeshake: true,
  removeNodeProtocol: false
}

export default defineConfig([
  {
    ...commonOptions,
    platform: 'neutral',
    entry: {
      // serve (noop)
      'elysia/serve': './src/serve/noop/elysia.ts',
      'express/serve': './src/serve/noop/express.ts',
      'fastify/serve': './src/serve/noop/fastify.ts',
      'h3/serve': './src/serve/noop/h3.ts',
      'hattip/serve': './src/serve/noop/hattip.ts',
      'hono/serve': './src/serve/noop/hono.ts',
      // serve (bun)
      'elysia/serve.bun': './src/serve/bun/elysia.ts',
      'h3/serve.bun': './src/serve/bun/h3.ts',
      'hattip/serve.bun': './src/serve/bun/hattip.ts',
      'hono/serve.bun': './src/serve/bun/hono.ts',
      // serve (deno)
      'elysia/serve.deno': './src/serve/deno/elysia.ts',
      'h3/serve.deno': './src/serve/deno/h3.ts',
      'hattip/serve.deno': './src/serve/deno/hattip.ts',
      'hono/serve.deno': './src/serve/deno/hono.ts',
      // serve (node)
      'elysia/serve.node': './src/serve/node/elysia.ts',
      'express/serve.node': './src/serve/node/express.ts',
      'fastify/serve.node': './src/serve/node/fastify.ts',
      'h3/serve.node': './src/serve/node/h3.ts',
      'hattip/serve.node': './src/serve/node/hattip.ts',
      'hono/serve.node': './src/serve/node/hono.ts'
    },
    esbuildPlugins: [virtualApply()],
    external: externalServers
      .concat(...builtinModules.flatMap((e) => [e, `node:${e}`]))
      .concat(/^photonjs:get-middlewares:/)
      .concat('@photonjs/core/dev')
  },
  {
    ...commonOptions,
    platform: 'node',
    entry: {
      plugin: './src/plugin/index.ts',
      api: './src/api.ts',
      dev: './src/dev.ts',
      index: './src/index.ts'
    }
  }
])
