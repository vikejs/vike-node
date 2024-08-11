import react from '@vitejs/plugin-react'
import esbuild from 'esbuild'
import { builtinModules } from 'module'
import vikeNode from 'vike-node/plugin'
import vike from 'vike/plugin'
import { UserConfig } from 'vite'

export default {
  plugins: [
    react(),
    vike({ prerender: true }),
    vikeNode({ entry: { index: 'server/node-entry.js', app: 'server/app.js' } }),

    // TODO: move this into library
    {
      apply(_, env) {
        return env.isSsrBuild && process.env.VERCEL
      },
      closeBundle() {
        esbuild.buildSync({
          entryPoints: ['dist/server/app.mjs'],
          outfile: 'dist/server/app.mjs',
          format: 'esm',
          external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
          bundle: true,
          target: 'es2022',
          logLevel: 'info',
          logOverride: {
            'ignored-bare-import': 'verbose',
            'require-resolve-not-external': 'verbose'
          },
          minify: false,
          allowOverwrite: true,
          define: {
            'process.env.NODE_ENV': '"production"',
            'import.meta.env.NODE_ENV': '"production"'
          },
          conditions: ['edge-light', 'worker', 'browser', 'module', 'import', 'require']
        })
      }
    }
  ]
} as UserConfig
