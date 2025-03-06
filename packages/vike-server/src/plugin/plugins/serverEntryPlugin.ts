import pc from '@brillout/picocolors'
import type { ConfigVitePluginServerEntry } from 'vike/types'
import type { Plugin, ResolvedConfig } from 'vite'
import { assert, assertUsage } from '../../utils/assert.js'
import { getConfigVikeNode } from '../utils/getConfigVikeNode.js'
import { injectRollupInputs } from '../utils/injectRollupInputs.js'
import { viteIsSSR } from '../utils/viteIsSSR.js'

export function serverEntryPlugin(): Plugin {
  let vikeEntries: Set<string> = new Set()
  const vikeInject: Set<string> = new Set()

  return {
    name: 'vike-server:serverEntry',
    async configResolved(config: ResolvedConfig & ConfigVitePluginServerEntry) {
      const resolvedVikeConfig = getConfigVikeNode(config)
      const { entry } = resolvedVikeConfig.server
      vikeEntries = new Set(Object.values(entry))
      assert(vikeEntries.size > 0)

      if (viteIsSSR(config)) {
        config.build.rollupOptions.input = injectRollupInputs(entry, config)
      }
    },

    async resolveId(id) {
      if (vikeEntries.has(id)) {
        if (id.startsWith('virtual:')) {
          vikeInject.add(`\0${id}`)
          return `\0${id}`
        }
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
