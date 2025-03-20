import pc from '@brillout/picocolors'
import { serverEntryVirtualId, type VitePluginServerEntryOptions } from '@brillout/vite-plugin-server-entry/plugin'
import type { Plugin, ResolvedConfig } from 'vite'
import { assert, assertUsage } from '../../utils/assert.js'
import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'
import path from 'node:path'
import { assertPosixPath } from '../utils/filesystemPathHandling.js'

declare module 'vite' {
  interface UserConfig {
    vitePluginServerEntry?: VitePluginServerEntryOptions
  }
}

export function serverEntryPlugin(): Plugin[] {
  let vikeEntries: Set<string> = new Set()
  const vikeInject: Set<string> = new Set()
  let serverEntryInjected = false

  const plugin1: Plugin = {
    name: 'vike-server:serverEntry-1',
    apply: 'build',

    applyToEnvironment(env) {
      return env.name === 'ssr'
    },

    async configResolved(config: ResolvedConfig) {
      const vikeServerConfig = getVikeServerConfig(config)
      const { entry } = vikeServerConfig
      vikeEntries = new Set(Object.values(entry).map((filePath) => pathResolve(config.root, filePath)))
      console.log('vikeEntries', vikeEntries)
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
        console.log('vikeInject', resolved.id)

        return resolved
      }
    },

    buildEnd() {
      assert(serverEntryInjected)
    },

    transform(code, id) {
      console.log('transform', id)
      // TODO support map
      if (vikeEntries.has(id) || vikeInject.has(id)) {
        serverEntryInjected = true
        console.log('inject', id)
        return `import "${serverEntryVirtualId}";\n${code}`
      }
    }
  }
  return [
    // TODO/now refactor: inline plugin1
    plugin1,
    {
      name: 'vike-server:serverEntry-2',
      apply: 'build',
      config() {
        return {
          vitePluginServerEntry: {
            inject: true, // Tell Vike that we're injecting imports of the virtual ID of the server entry
            disableAutoImport: true
          }
        }
      }
    }
  ]
}

function pathResolve(p1: string, p2: string) {
  assertPosixPath(p1)
  assertPosixPath(p2)
  console.log('p1', p1)
  console.log('p2', p2)
  if (path.isAbsolute(p2)) return p2
  const res = path.resolve(p1, p2)
  console.log('res', res)
  return res
}
