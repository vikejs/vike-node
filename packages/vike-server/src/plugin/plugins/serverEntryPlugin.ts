import { createRequire } from 'node:module'
import path from 'node:path'
import pc from '@brillout/picocolors'
import type { ConfigVitePluginServerEntry } from 'vike/types'
import type { Plugin, ResolvedConfig } from 'vite'
import type { EntryResolved } from '../../types.js'
import { assert, assertUsage } from '../../utils/assert.js'
import { getConfigVikeNode } from '../utils/getConfigVikeNode.js'
import { injectRollupInputs } from '../utils/injectRollupInputs.js'
import { viteIsSSR } from '../utils/viteIsSSR.js'

const require_ = createRequire(import.meta.url)

export function serverEntryPlugin(): Plugin {
  return {
    name: 'vike-server:serverEntry',
    async configResolved(config: ResolvedConfig & ConfigVitePluginServerEntry) {
      const resolvedConfig = getConfigVikeNode(config)
      const { entry } = resolvedConfig.server
      const entries = Object.entries(entry)
      assert(entries.length > 0)

      const resolvedEntries: EntryResolved = {
        index: { entry: '', runtime: 'node' } // Initialize with a placeholder, will be overwritten
      }

      for (const [name, entryInfo] of entries) {
        const { entry: entryPath, runtime } = entryInfo
        const entryFilePath = path.join(config.root, entryPath)
        try {
          resolvedEntries[name] = {
            entry: require_.resolve(entryFilePath),
            runtime
          }
        } catch (err) {
          assert((err as Record<string, unknown>).code === 'MODULE_NOT_FOUND')
          assertUsage(
            false,
            `No file found at ${entryFilePath}. Make sure ${pc.cyan(`server.entry.${name}`)} points to an existing file.`
          )
        }
      }

      if (viteIsSSR(config)) {
        config.build.rollupOptions.input = injectRollupInputs(
          Object.fromEntries(Object.entries(resolvedEntries).map(([name, { entry: path }]) => [name, path])),
          config
        )
      }

      config.vitePluginServerEntry ??= {}
      config.vitePluginServerEntry.inject = Object.keys(resolvedEntries)
    }
  }
}
