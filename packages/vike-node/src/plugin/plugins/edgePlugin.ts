import { builtinModules } from 'module'
import { gzip } from 'node:zlib'
import path from 'path'
import { promisify } from 'util'
import esbuild from 'esbuild'
import fs from 'fs/promises'
import { prerender } from 'vike/prerender'
import type { Plugin, ResolvedConfig } from 'vite'
import type { ConfigVikeNodeResolved, Runtime } from '../../types.js'
import { assert } from '../../utils/assert.js'
import { copyFileOrFolder } from '../utils/copyFileOrFolder.js'
import { toPosixPath } from '../utils/filesystemPathHandling.js'
import { getConfigVikeNode } from '../utils/getConfigVikeNode.js'
import { logVikeNode } from '../utils/logVikeNode.js'
import { unenvPlugin } from './esbuild/unenvPlugin.js'

const compress = promisify(gzip)

const DEFAULT_CONDITIONS = ['edge-light', 'workerd', 'worker', 'browser', 'module', 'import', 'require']

type Entry = {
  name: string
  runtime: Runtime
  path: string
  scaffold: string | false
}

type EntryWithOutFile = Entry & {
  outFile: string
}

export function edgePlugin(): Plugin[] {
  let viteConfig: ResolvedConfig
  let configResolvedVikeNode: ConfigVikeNodeResolved
  let configResolvedVike: any
  let outDir: string
  let outDirAbs: string
  let root: string
  let entries: Entry[]
  let entriesWithOutFile: EntryWithOutFile[]

  return [createServePlugin(), createBuildPlugin(), createScaffoldPlugin()]

  function createServePlugin(): Plugin {
    return {
      name: 'vike-node:edge:serve',
      apply: 'serve',
      config() {
        return {
          resolve: {
            conditions: ['vike-node-dev']
          }
        }
      }
    }
  }

  function createBuildPlugin(): Plugin {
    return {
      name: 'vike-node:edge:build',
      enforce: 'pre',
      apply(config) {
        return !!config.build?.ssr
      },
      config(config) {
        configResolvedVikeNode = getConfigVikeNode(config)
        entries = getEntries(configResolvedVikeNode)

        if (entries.length === 0) {
          return null
        }

        return {
          ssr: { target: 'webworker' },
          build: {
            rollupOptions: { external: [...builtinModules, /^node:/] },
            target: 'es2022'
          },
          resolve: { conditions: DEFAULT_CONDITIONS }
        }
      },
      configResolved(config) {
        viteConfig = config
        root = toPosixPath(config.root)
        outDir = toPosixPath(config.build.outDir)
        outDirAbs = path.posix.join(root, outDir)

        // Now that outDirAbs is available, we can create entriesWithOutFile
        entriesWithOutFile = entries.map((entry) => ({
          ...entry,
          outFile: path.posix.join(outDirAbs, `${entry.name}.mjs`)
        }))
      },
      closeBundle: {
        order: 'pre',
        sequential: true,
        handler: buildEntries
      }
    }
  }

  function createScaffoldPlugin(): Plugin {
    return {
      name: 'vike-node:edge:scaffold',
      enforce: 'post',
      apply(config) {
        return !!config.build?.ssr
      },
      // @ts-ignore
      config() {
        if (!entries.length || entries.some((e) => !e.scaffold)) return
        return {
          vitePluginSsr: {
            prerender: { disableAutoRun: true }
          }
        }
      },
      async configResolved(config) {
        // @ts-ignore
        configResolvedVike = await config.configVikePromise
      },
      closeBundle: {
        sequential: true,
        order: 'post',
        handler: scaffoldEntries
      }
    }
  }

  function getEntries(config: ConfigVikeNodeResolved): Entry[] {
    return Object.entries(config.server.entry)
      .filter(([_, entry]) => entry.runtime !== 'node')
      .map(([name, entry]) => ({
        name,
        runtime: entry.runtime,
        path: entry.entry,
        scaffold: ('scaffold' in entry && entry.scaffold) || false
      }))
  }

  async function buildEntries() {
    if (entriesWithOutFile.length === 0) return

    for (const entry of entriesWithOutFile) {
      const result = await esbuild.build({
        entryPoints: [path.posix.join(root, entry.path)],
        outfile: entry.outFile,
        format: 'esm',
        target: 'es2022',
        bundle: true,
        minify: viteConfig.build.minify !== false,
        sourcemap: !!viteConfig.build.sourcemap,
        outExtension: { '.js': '.mjs' },
        write: false,
        external: configResolvedVikeNode.server.external,
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

      const content = result.outputFiles[0]!.contents
      const zipped = await compress(content, { level: 9 })
      logVikeNode(`built entry: ${entry.name}, gzip: ${(zipped.length / 1024).toFixed(2)} kB`)

      await fs.mkdir(path.dirname(entry.outFile), { recursive: true }).catch(() => {})
      await fs.writeFile(entry.outFile, content, 'utf-8')
    }
  }

  async function scaffoldEntries() {
    if (!entries.length || entries.some((e) => !e.scaffold)) return
    const staticRoutes = configResolvedVike.prerender ? await prerenderPages() : []
    const scaffoldableEntries = entriesWithOutFile.filter((e) => e.scaffold)

    for (const entry of scaffoldableEntries) {
      if (['cloudflare', 'cloudflare-nodejs-compat'].includes(entry.runtime)) {
        await scaffoldCf(entry, staticRoutes)
      }
    }
  }

  async function prerenderPages(): Promise<string[]> {
    const staticRoutes: string[] = []
    await prerender({
      async onPagePrerender(page: any) {
        const result = page._prerenderResult
        const isJson = result.filePath.endsWith('.pageContext.json')
        const route = isJson ? path.posix.join(page.urlOriginal, result.filePath.split('/').pop()) : page.urlOriginal
        staticRoutes.push(route)

        await fs.mkdir(path.dirname(result.filePath), { recursive: true }).catch(() => {})
        await fs.writeFile(result.filePath, result.fileContent, 'utf-8')
      }
    })
    return staticRoutes
  }

  async function scaffoldCf(entry: EntryWithOutFile, staticRoutes: string[]) {
    assert(entry.scaffold)
    await fs.rm(entry.scaffold, { recursive: true, force: true }).catch(() => {})
    await copyFileOrFolder(entry.outFile, path.posix.join(entry.scaffold, '_worker.js'))
    await copyFileOrFolder('./dist/client', entry.scaffold)

    const routesJson = JSON.stringify(
      {
        version: 1,
        include: ['/*'],
        exclude: ['/assets/*', ...staticRoutes]
      },
      null,
      2
    )
    await fs.writeFile(path.posix.join(entry.scaffold, '_routes.json'), routesJson, 'utf-8')
  }
}
