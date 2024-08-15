import pc from '@brillout/picocolors'
import { createRequire } from 'module'
import path from 'path'
import type { Plugin } from 'vite'
import type { EntryResolved } from '../../types.js'
import { assert, assertUsage } from '../../utils/assert.js'
import { getConfigVikeNode } from '../utils/getConfigVikeNode.js'
import { injectRollupInputs } from '../utils/injectRollupInputs.js'
import { viteIsSSR } from '../utils/viteIsSSR.js'

const require_ = createRequire(import.meta.url)

export function serverEntryPlugin(): Plugin {
  return {
    name: 'vike-node:serverEntry',
    async configResolved(config) {
      const resolvedConfig = getConfigVikeNode(config)
      const { entry } = resolvedConfig.server
      const entries = Object.entries(entry)
      assert(entries.length > 0)

      const resolvedEntries: EntryResolved = {
        index: { entry: '', runtime: 'node' } // Initialize with a placeholder, will be overwritten
      }

      for (const [name, entryInfo] of entries) {
        const { entry: entryPath, runtime } = entryInfo
        let entryFilePath = path.join(config.root, entryPath)
        try {
          resolvedEntries[name] = {
            entry: require_.resolve(entryFilePath),
            runtime
          }
        } catch (err) {
          assert((err as Record<string, unknown>).code === 'MODULE_NOT_FOUND')
          assertUsage(
            false,
            `No file found at ${entryFilePath}. Does the value ${pc.cyan(`'${entryFilePath}'`)} of ${pc.cyan(
              `server.entry.${name}.path`
            )} point to an existing file?`
          )
        }
      }

      if (viteIsSSR(config)) {
        config.build.rollupOptions.input = injectRollupInputs(
          Object.fromEntries(Object.entries(resolvedEntries).map(([name, { entry: path }]) => [name, path])),
          config
        )
      }
    }
  }
}
