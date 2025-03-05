import { defineConfig } from 'tsup'

const external = ['stream', 'http', 'path', 'url', 'zlib']

export default defineConfig([
  {
    entry: {
      elysia: './src/handlers/adapters/elysia.ts',
      express: './src/handlers/adapters/express.ts',
      fastify: './src/handlers/adapters/fastify.ts',
      h3: './src/handlers/adapters/h3.ts',
      hattip: './src/handlers/adapters/hattip.ts',
      hono: './src/handlers/adapters/hono.ts'
    },
    format: ['esm'],
    platform: 'neutral',
    target: 'es2022',
    esbuildOptions(opts) {
      opts.outbase = 'src'
    },
    external: external.flatMap((e) => [e, `node:${e}`]),
    dts: true,
    outDir: 'dist',
    bundle: true,
    treeshake: true
  },
  {
    entry: {
      'plugin/index': './src/plugin/index.ts',
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
