import pc from '@brillout/picocolors'
import type { ConfigVitePluginServerEntry } from 'vike/types'
import type { Plugin, ResolvedConfig } from 'vite'
import { assert, assertUsage } from '../../utils/assert.js'
import { getConfigVikeNode } from '../utils/getConfigVikeNode.js'
import type { ConfigVikeNodeResolved } from '../../types.js'

export function serverEntryPlugin(): Plugin {
  let resolvedVikeConfig: ConfigVikeNodeResolved
  let vikeEntries: Set<string> = new Set()
  const vikeInject: Set<string> = new Set()

  return {
    name: 'vike-server:serverEntry',

    // TODO support vite@5?
    applyToEnvironment(env) {
      return env.name === 'ssr'
    },

    async configResolved(config: ResolvedConfig & ConfigVitePluginServerEntry) {
      resolvedVikeConfig = getConfigVikeNode(config)
      const { entry } = resolvedVikeConfig.server
      vikeEntries = new Set(Object.values(entry))
      assert(vikeEntries.size > 0)
    },

    buildStart() {
      const { entry } = resolvedVikeConfig.server

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
      if (vikeInject.has(id)) {
        return `import "virtual:@brillout/vite-plugin-server-entry:serverEntry";\n${code}`
      }
    }
  }
}
