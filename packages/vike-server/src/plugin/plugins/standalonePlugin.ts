import path from 'node:path'
import esbuild, { type BuildOptions } from 'esbuild'
import type { Plugin, ResolvedConfig, Rollup } from 'vite'
import type { ConfigVikeServerResolved } from '../../types.js'
import { assert } from '../../utils/assert.js'
import { toPosixPath } from '../utils/filesystemPathHandling.js'
import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'

const OPTIONAL_NPM_IMPORTS = [
  '@nestjs/microservices',
  '@nestjs/websockets',
  'cache-manager',
  'class-validator',
  'class-transformer'
]

export function standalonePlugin(): Plugin {
  let root = ''
  let outDir = ''
  let outDirAbs = ''
  let rollupEntryFilePaths: Record<string, string> = {}
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  let rollupResolve: (...args: any[]) => Promise<any>

  return {
    name: 'vike-server:standalone',
    apply: 'build',
    applyToEnvironment(env) {
      if (env.name === 'ssr') {
        return Boolean(getVikeServerConfig(env.config).standalone)
      }
      return false
    },
    async configResolved(config) {
      root = toPosixPath(config.root)
      outDir = toPosixPath(config.build.outDir)
      outDirAbs = path.isAbsolute(outDir) ? outDir : path.posix.join(root, outDir)
    },
    buildStart() {
      rollupResolve = this.resolve.bind(this)
    },
    writeBundle(_, bundle) {
      const vikeServerConfig = getVikeServerConfig(this.environment.config)
      const entries = findRollupBundleEntries(bundle, vikeServerConfig)
      rollupEntryFilePaths = entries.reduce(
        (acc, cur) => {
          acc[cur.fileName.replace('.js', '.standalone')] = path.posix.join(outDirAbs, cur.fileName)
          return acc
        },
        {} as Record<string, string>
      )
    },
    enforce: 'post',
    async closeBundle() {
      const vikeServerConfig = getVikeServerConfig(this.environment.config)
      const userEsbuildOptions =
        typeof vikeServerConfig.standalone === 'object' && vikeServerConfig.standalone !== null
          ? vikeServerConfig.standalone.esbuild
          : {}

      await buildWithEsbuild(userEsbuildOptions, this.environment.config)
    },
    sharedDuringBuild: true
  }

  async function buildWithEsbuild(userEsbuildOptions: BuildOptions | undefined, resolvedConfig: ResolvedConfig) {
    const vikeServerConfig = getVikeServerConfig(resolvedConfig)
    const res = await esbuild.build({
      platform: 'node',
      format: 'esm',
      bundle: true,
      external: vikeServerConfig.external,
      entryPoints: rollupEntryFilePaths,
      sourcemap: resolvedConfig.build.sourcemap === 'hidden' ? true : resolvedConfig.build.sourcemap,
      splitting: false,
      outExtension: { '.js': '.mjs' },
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

function findRollupBundleEntries(bundle: Rollup.OutputBundle, vikeServerConfig: ConfigVikeServerResolved) {
  const entries = Object.keys(vikeServerConfig.entry)

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
