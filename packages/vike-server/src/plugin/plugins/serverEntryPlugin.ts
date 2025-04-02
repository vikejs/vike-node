import pc from '@brillout/picocolors'
import MagicString from 'magic-string'
import { serverEntryVirtualId, type VitePluginServerEntryOptions } from '@brillout/vite-plugin-server-entry/plugin'
import type { Plugin, ResolvedConfig } from 'vite'
import { assert, assertUsage } from '../../utils/assert.js'
import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'
import type { PhotonEntry, SupportedServers } from '../../types.js'

declare module 'vite' {
  interface UserConfig {
    vitePluginServerEntry?: VitePluginServerEntryOptions
  }
}

const idsToServers: Record<string, SupportedServers> = {
  'vike-server/hono': 'hono',
  'vike-server/hattip': 'hattip',
  'vike-server/express': 'express',
  'vike-server/fastify': 'fastify',
  'vike-server/h3': 'h3',
  'vike-server/elysia': 'elysia'
}

export function serverEntryPlugin(options?: { fallbackUniversalEntry?: string }): Plugin[] {
  const resolvedPlugins = new Map<string, SupportedServers>()
  let vikeEntries: Map<string, PhotonEntry> = new Map()
  const vikeInject: Set<string> = new Set()
  let serverEntryInjected = false

  return [
    {
      name: 'vike-server:resolve-entries:pre',
      enforce: 'pre',
      async resolveId(id, importer, opts) {
        if (id in idsToServers) {
          const resolved = await this.resolve(id, importer, opts)
          if (resolved) {
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            resolvedPlugins.set(resolved.id, idsToServers[id]!)
          }
        }
      }
    },
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
        vikeEntries = new Map(Object.values(entry).map((e) => [e.id, e]))
        assert(vikeEntries.size > 0)
      },

      buildStart() {
        const vikeServerConfig = getVikeServerConfig(this.environment.config)
        const { entry } = vikeServerConfig

        for (const [name, photonEntry] of Object.entries(entry)) {
          this.emitFile({
            type: 'chunk',
            fileName: `${name}.js`,
            id: photonEntry.id,
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
        assert(serverEntryInjected)
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
      name: 'vike-server:resolve-entries',
      async load(id) {
        if (vikeInject.has(id)) {
          // biome-ignore lint/style/noNonNullAssertion: <explanation>
          const photonEntry = vikeEntries.get(id)!

          assert(photonEntry.type)

          if (photonEntry.type === 'auto' || photonEntry.type === 'server') {
            // Resolve entry graph until we find a plugin
            const loaded = await this.load({ id, resolveDependencies: true })
            // early return for better performance
            if (photonEntry.type === 'server') return loaded
            const graph = new Set([...loaded.importedIdResolutions, ...loaded.dynamicallyImportedIdResolutions])

            let found: SupportedServers | undefined
            for (const imported of graph.values()) {
              found = resolvedPlugins.get(imported.id)
              if (found) break
              if (imported.external) continue
              const sub = await this.load({ id: imported.id, resolveDependencies: true })
              for (const imp of [...sub.importedIdResolutions, ...sub.dynamicallyImportedIdResolutions]) {
                graph.add(imp)
              }
            }
            if (found) {
              // FIXME
              return {
                ...loaded,
                meta: {
                  photon: {
                    server: found
                  }
                }
              }
            }
          }
          // else, assume Universal Handler entry

          assertUsage(
            options?.fallbackUniversalEntry,
            '[vike-server] Framework must provide { fallbackUniversalEntry }'
          )

          // FIXME In dev, this MUST then be used by viteServer middleware
          // FIXME In prod, this MUST be imported by another adapter
          return this.load({ id: options?.fallbackUniversalEntry })
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
