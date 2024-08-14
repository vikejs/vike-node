import esbuild from 'esbuild'
import { builtinModules } from 'module'
import path from 'path'
import type { Plugin, ResolvedConfig } from 'vite'
import { ConfigVikeNodeResolved } from '../../types.js'
import { toPosixPath } from '../utils/filesystemPathHandling.js'
import { getConfigVikeNode } from '../utils/getConfigVikeNode.js'
import { logVikeNode } from '../utils/logVikeNode.js'
import { unenvPlugin } from './esbuild/unenvPlugin.js'

export function edgePlugin(): Plugin[] {
  let viteConfig: ResolvedConfig
  let configResolvedVike: ConfigVikeNodeResolved
  let outDir: string
  let outDirAbs: string
  let root: string

  const DEFAULT_CONDITIONS = ['edge-light', 'workerd', 'worker', 'browser', 'module', 'import', 'require']

  return [
    {
      name: 'vike-node:edge:serve',
      apply: 'serve',
      config() {
        return {
          resolve: {
            conditions: ['vike-node-dev']
          }
        }
      }
    },
    {
      name: 'vike-node:edge:build',
      apply(config) {
        return !!config.build?.ssr
      },
      configResolved(config) {
        viteConfig = config
        configResolvedVike = getConfigVikeNode(config)
        root = toPosixPath(config.root)
        outDir = toPosixPath(config.build.outDir)
        outDirAbs = path.posix.join(root, outDir)
      },
      config(config) {
        const resolvedConfig = getConfigVikeNode(config)
        const hasNodelessEntry = Object.values(resolvedConfig.server.entry).some((entry) => entry.runtime !== 'node')
        if (hasNodelessEntry) {
          // TODO: add unenv plugin
          return {
            ssr: {
              target: 'webworker'
            },
            build: {
              rollupOptions: {
                external: [...builtinModules, /^node:/]
              },
              target: 'es2022'
            },
            resolve: {
              // https://github.com/cloudflare/workers-sdk/blob/515de6ab40ed6154a2e6579ff90b14b304809609/packages/wrangler/src/deployment-bundle/bundle.ts#L37
              conditions: DEFAULT_CONDITIONS
            }
          }
        }
      },
      async closeBundle() {
        const entries = Object.entries(configResolvedVike.server.entry)
          .filter(([_, entry]) => entry.runtime !== 'node')
          .map(([name, entry]) => ({
            name,
            runtime: entry.runtime,
            path: path.posix.join(root, entry.path)
          }))

        if (entries.length === 0) return

        for (const entry of entries) {
          await esbuild.build({
            entryPoints: [entry.path],
            outdir: outDirAbs,
            format: 'esm',
            target: 'es2022',
            bundle: true,
            minify: viteConfig.build.minify !== false,
            sourcemap: !!viteConfig.build.sourcemap,
            outExtension: { '.js': '.mjs' },
            allowOverwrite: true,
            external: configResolvedVike.server.external,
            define: {
              'process.env.NODE_ENV': '"production"',
              'import.meta.env.NODE_ENV': '"production"'
            },
            conditions: DEFAULT_CONDITIONS,
            logLevel: 'info',
            logOverride: {
              'ignored-bare-import': 'verbose',
              'require-resolve-not-external': 'verbose'
            },
            plugins: [unenvPlugin(entry.runtime)]
          })
          logVikeNode(`built entry: ${entry.name}`)
        }
      }
    }
  ]
}
