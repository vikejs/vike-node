import pc from '@brillout/picocolors'
import { serverEntryVirtualId, type VitePluginServerEntryOptions } from '@brillout/vite-plugin-server-entry/plugin'
import type { Plugin, ResolvedConfig } from 'vite'
import { assert, assertUsage } from '../../utils/assert.js'
import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'
import path from 'node:path'

declare module 'vite' {
  interface UserConfig {
    vitePluginServerEntry?: VitePluginServerEntryOptions
  }
}

export function serverEntryPlugin(): Plugin {
  let vikeEntries: Set<string> = new Set()
  const vikeInject: Set<string> = new Set()

  return {
    name: 'vike-server:serverEntry',

    applyToEnvironment(env) {
      return env.name === 'ssr'
    },

    config() {
      return {
        vitePluginServerEntry: {
          inject: ['TODO/now'] as any as boolean, // Tell Vike that we're injecting imports of the virtual ID of the server entry
          disableAutoImport: true
        }
      }
    },

    async configResolved(config: ResolvedConfig) {
      const vikeServerConfig = getVikeServerConfig(config)
      const { entry } = vikeServerConfig
      vikeEntries = new Set(Object.values(entry).map((filePath) => path.resolve(config.root, filePath)))
      assert(vikeEntries.size > 0)
    },

    buildStart() {
      const vikeServerConfig = getVikeServerConfig(this.environment.config)
      const { entry } = vikeServerConfig

      for (const [name, filepath] of Object.entries(entry)) {
        this.emitFile({
          type: 'chunk',
          fileName: `${name}.js`,
          id: filepath,
          importer: undefined
        })
      }
    },

    async resolveId(id) {
      if (vikeEntries.has(id)) {
        const resolved = await this.resolve(id)
        assertUsage(
          resolved,
          `No file found at ${id}. Update your ${pc.cyan('server.entry')} configuration to point to an existing file.`
        )

        vikeInject.add(resolved.id)

        return resolved
      }
    },

    transform(code, id) {
      // TODO support map
      if (vikeEntries.has(id) || vikeInject.has(id)) {
        return `import "${serverEntryVirtualId}";\n${code}`
      }
    }
  }
}
