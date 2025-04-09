import { builtinModules } from 'node:module'
import { defineConfig } from 'tsup'

const externalServers: string[] = ['elysia', 'fastify', 'h3', 'hono']

export default defineConfig([
  {
    entry: {
      // Universal Middlewares and Handler
      universal: './src/middleware/index.prod.ts',
      'universal.dev': './src/middleware/index.dev.ts',
      'universal.edge': './src/middleware/index.prod.edge.ts'
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
