import pc from '@brillout/picocolors'
import MagicString from 'magic-string'
import { serverEntryVirtualId, type VitePluginServerEntryOptions } from '@brillout/vite-plugin-server-entry/plugin'
import type { Plugin, ResolvedConfig } from 'vite'
import { assert, assertUsage } from '../../utils/assert.js'
import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'

declare module 'vite' {
  interface UserConfig {
    vitePluginServerEntry?: VitePluginServerEntryOptions
  }
}

export function serverEntryPlugin(): Plugin[] {
  let vikeEntries: Set<string> = new Set()
  const vikeInject: Set<string> = new Set()
  let serverEntryInjected = false

  return [
    {
      name: 'vike-server:serverEntry',
      apply: 'build',
      enforce: 'pre',

      applyToEnvironment(env) {
        return env.name === 'ssr'
      },

      async configResolved(config: ResolvedConfig) {
        const vikeServerConfig = getVikeServerConfig(config)
        const { entry } = vikeServerConfig
        vikeEntries = new Set(Object.values(entry))
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
          let resolved = await this.resolve(id)
          if (!resolved) {
            resolved = await this.resolve(`${this.environment.config.root}/${id}`)
          }
          assertUsage(
            resolved,
            `No file found at ${id}. Update your ${pc.cyan('server.entry')} configuration to point to an existing file. This file should be relative to your project's root.`
          )

          vikeInject.add(resolved.id)

          return resolved
        }
      },

      buildEnd() {
        assertUsage(serverEntryInjected, 'Failed to inject virtual server entry.')
      },

      transform(code, id) {
        if (vikeInject.has(id)) {
          const ms = new MagicString(code)
          ms.prepend(`import "${serverEntryVirtualId}";\n`)
          serverEntryInjected = true
          return {
            code: ms.toString(),
            map: ms.generateMap({
              hires: true,
              source: id
            })
          }
        }
      }
    },
    {
      name: 'vike-server:serverEntry:vitePluginServerEntry',
      /* `inject: true` also needs to be set when running `$ vike preview`, see https://github.com/vikejs/vike/blob/97f1a076cb62fd6b9b210769474a06e368792459/vike/node/api/preview.ts#L21
      apply: 'build',
      */
      config() {
        return {
          vitePluginServerEntry: {
            // Tell Vike that we're injecting import statements that import the server entry `serverEntryVirtualId`
            inject: true,
            disableAutoImport: true
          }
        }
      }
    }
  ]
}
