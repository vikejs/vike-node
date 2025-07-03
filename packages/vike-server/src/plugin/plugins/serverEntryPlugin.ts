import { serverEntryVirtualId, type VitePluginServerEntryOptions } from '@brillout/vite-plugin-server-entry/plugin'
import { isPhotonMeta } from '@photonjs/core/api'
import MagicString from 'magic-string'
import type { Plugin } from 'vite'
import { assertUsage } from '../../utils/assert.js'

declare module 'vite' {
  interface UserConfig {
    vitePluginServerEntry?: VitePluginServerEntryOptions
  }
}

export function serverEntryPlugin(): Plugin[] {
  let serverEntryInjected = false

  return [
    {
      name: 'vike-server:serverEntry',
      apply: 'build',

      applyToEnvironment(env) {
        return env.config.consumer === 'server'
      },

      buildEnd() {
        assertUsage(serverEntryInjected, 'Failed to inject virtual server entry.')
      },

      transform: {
        order: 'post',
        handler(code, id) {
          const meta = this.getModuleInfo(id)?.meta
          if (isPhotonMeta(meta) || meta?.photonConfig?.isTargetEntry) {
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

      sharedDuringBuild: true
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
      },

      sharedDuringBuild: true
    }
  ]
}
