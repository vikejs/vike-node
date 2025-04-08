import { builtinModules } from 'node:module'
import virtualApply from '@photonjs/core/esbuild'
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
    esbuildPlugins: [
      virtualApply({
        // TODO probably provide a custom API instead of a generic resolveId
        resolveId(id) {
          // TODO VikeOptions typing of RuntimeAdapter is generic because this export is generic
          //  if we had an export per server, we could properly type VikeOptions
          return {
            id: 'vike-server/universal-middlewares',
            external: true
          }
        }
      })
    ],
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
