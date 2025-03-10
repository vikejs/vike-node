import fs from 'node:fs/promises'
import path from 'node:path'
import esbuild, { type BuildOptions } from 'esbuild'
import type { Plugin, ResolvedConfig, Rollup } from 'vite'
import type { ConfigVikeNodeResolved } from '../../types.js'
import { assert } from '../../utils/assert.js'
import { toPosixPath } from '../utils/filesystemPathHandling.js'
import { getConfigVikeNode } from '../utils/getConfigVikeNode.js'

const OPTIONAL_NPM_IMPORTS = [
  '@nestjs/microservices',
  '@nestjs/websockets',
  'cache-manager',
  'class-validator',
  'class-transformer'
]

export function standalonePlugin(): Plugin {
  let configResolved: ResolvedConfig
  let configResolvedVike: ConfigVikeNodeResolved
  let enabled = false
  let root = ''
  let outDir = ''
  let outDirAbs = ''
  let rollupEntryFilePaths: string[] = []
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  let rollupResolve: (...args: any[]) => Promise<any>

  return {
    name: 'vike-server:standalone',
    apply: (_, env) => !!env.isSsrBuild,
    configResolved: async (config) => {
      configResolved = config
      configResolvedVike = getConfigVikeNode(config)
      enabled = Boolean(configResolvedVike.server.standalone)
      if (!enabled) return
      root = toPosixPath(config.root)
      outDir = toPosixPath(config.build.outDir)
      outDirAbs = path.isAbsolute(outDir) ? outDir : path.posix.join(root, outDir)
    },
    buildStart() {
      if (!enabled) return
      rollupResolve = this.resolve.bind(this)
    },
    writeBundle(_, bundle) {
      if (!enabled) return
      const entries = findRollupBundleEntries(bundle, configResolvedVike)
      rollupEntryFilePaths = entries.map((e) => path.posix.join(outDirAbs, e.fileName))
    },
    enforce: 'post',
    closeBundle: async () => {
      if (!enabled) return

      const userEsbuildOptions =
        typeof configResolvedVike.server.standalone === 'object' && configResolvedVike.server.standalone !== null
          ? configResolvedVike.server.standalone.esbuild
          : {}

      const esbuildResult = await buildWithEsbuild(userEsbuildOptions)
      await removeLeftoverFiles(esbuildResult)
    },
    sharedDuringBuild: true
  }

  async function buildWithEsbuild(userEsbuildOptions: BuildOptions | undefined) {
    const res = await esbuild.build({
      platform: 'node',
      format: 'esm',
      bundle: true,
      external: configResolvedVike.server.external,
      entryPoints: rollupEntryFilePaths,
      sourcemap: configResolved.build.sourcemap === 'hidden' ? true : configResolved.build.sourcemap,
      outExtension: { '.js': '.mjs' },
      splitting: false,
      outdir: outDirAbs,
      allowOverwrite: true,
      logOverride: { 'ignored-bare-import': 'silent' },
      banner: { js: generateBanner() },
      plugins: [createStandaloneIgnorePlugin(rollupResolve), ...(userEsbuildOptions?.plugins ?? [])],
      ...userEsbuildOptions,
      metafile: true
    })

    return res
  }

  async function removeLeftoverFiles(res: Awaited<ReturnType<typeof buildWithEsbuild>>) {
    // Remove bundled files from outDir
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const bundledFilesFromOutDir = Object.keys(res.metafile!.inputs).filter(
      (relativeFile) =>
        !rollupEntryFilePaths.some((entryFilePath) => entryFilePath.endsWith(relativeFile)) &&
        relativeFile.startsWith(outDir)
    )

    await Promise.all(
      bundledFilesFromOutDir.map(async (relativeFile) => {
        await fs.rm(path.posix.join(root, relativeFile))
        if (![false, 'inline'].includes(configResolved.build.sourcemap)) {
          await fs.rm(path.posix.join(root, `${relativeFile}.map`))
        }
      })
    )

    // Remove empty directories
    const relativeDirs = new Set(bundledFilesFromOutDir.map((file) => path.dirname(file)))
    for (const relativeDir of relativeDirs) {
      const absDir = path.posix.join(root, relativeDir)
      const files = await fs.readdir(absDir)
      if (!files.length) {
        await fs.rm(absDir, { recursive: true })
        if (relativeDir.startsWith(outDir)) {
          relativeDirs.add(path.dirname(relativeDir))
        }
      }
    }
  }
}

function generateBanner() {
  return [
    "import { dirname as dirname987 } from 'path';",
    "import { fileURLToPath as fileURLToPath987 } from 'url';",
    "import { createRequire as createRequire987 } from 'module';",
    'var require = createRequire987(import.meta.url);',
    'var __filename = fileURLToPath987(import.meta.url);',
    'var __dirname = dirname987(__filename);'
  ].join('\n')
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function createStandaloneIgnorePlugin(rollupResolve: (...args: any[]) => Promise<any>): esbuild.Plugin {
  return {
    name: 'standalone-ignore',
    setup(build) {
      build.onResolve({ filter: /.*/, namespace: 'ignore' }, (args) => ({
        path: args.path,
        namespace: 'ignore'
      }))
      build.onResolve({ filter: new RegExp(`^(${OPTIONAL_NPM_IMPORTS.join('|')})`) }, async (args) => {
        const resolved = await rollupResolve(args.path)
        if (!resolved) {
          return { path: args.path, namespace: 'ignore' }
        }
      })
      build.onLoad({ filter: /.*/, namespace: 'ignore' }, () => ({ contents: '' }))
    }
  }
}

function findRollupBundleEntries(bundle: Rollup.OutputBundle, resolvedConfig: ConfigVikeNodeResolved) {
  const entries = Object.keys(resolvedConfig.server.entry)

  const chunks: Rollup.OutputChunk[] = []
  for (const key in bundle) {
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const entry = bundle[key]!
    if (entry?.type !== 'chunk') continue
    if (!entry.isEntry) continue
    if (entries.includes(entry.name)) {
      chunks.push(entry)
    }
  }

  const serverIndex = chunks.find((e) => e.name === 'index')
  assert(serverIndex)

  return chunks.sort((a, b) => (a.name === 'index' ? -1 : b.name === 'index' ? 1 : 0))
}
