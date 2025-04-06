import MagicString from 'magic-string'
import { serverEntryVirtualId, type VitePluginServerEntryOptions } from '@brillout/vite-plugin-server-entry/plugin'
import type { Plugin } from 'vite'
import { assert, assertUsage } from '../../utils/assert.js'
import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'
import type { SupportedServers } from '../../types.js'
import { asPhotonEntryId, assertPhotonEntryId, isPhotonEntryId, stripPhotonEntryId } from '../utils/entry.js'

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

// biome-ignore lint/complexity/noBannedTypes: <explanation>
type LoadPluginContext = ThisParameterType<Extract<Plugin['load'], Function>>
// biome-ignore lint/complexity/noBannedTypes: <explanation>
type ResolveIdPluginContext = ThisParameterType<Extract<Plugin['resolveId'], Function>>
type PluginContext = LoadPluginContext | ResolveIdPluginContext

async function loadGraphAndExtractMeta<C extends PluginContext>(
  pluginContext: C,
  resolvedPlugins: Map<string, SupportedServers>,
  id: string
) {
  console.log('loadGraphAndExtractMeta')
  // Resolve entry graph until we find a plugin
  const resolved = await pluginContext.resolve(id)
  console.log('RESOLVED', id, resolved)
  assertUsage(resolved, `Failed to resolve: ${id}`)
  assertUsage(!resolved.external, `Entry should not be external: ${id}`)
  const loaded = await pluginContext.load({ ...resolved, resolveDependencies: true })
  console.log('GUY', pluginContext.environment.name, resolved, loaded)
  // early return for better performance
  if (loaded.meta?.photon?.type && loaded.meta.photon.type !== 'auto') return loaded
  const graph = new Set([...loaded.importedIdResolutions, ...loaded.dynamicallyImportedIdResolutions])

  let found: SupportedServers | undefined
  for (const imported of graph.values()) {
    found = resolvedPlugins.get(imported.id)
    if (found) break
    if (imported.external) continue
    const sub = await pluginContext.load({ ...imported, resolveDependencies: true })
    for (const imp of [...sub.importedIdResolutions, ...sub.dynamicallyImportedIdResolutions]) {
      graph.add(imp)
    }
  }

  if (found) {
    return {
      ...loaded,
      meta: {
        photon: {
          type: 'server',
          server: found
        }
      }
    }
  }

  return {
    ...loaded,
    meta: {
      photon: {
        type: 'universal-handler'
      }
    }
  }
}

function asPhotonEntry<T extends { id: string } | null | undefined>(entry: T, bypass?: boolean): T {
  if (bypass) return entry
  return entry
    ? {
        ...entry,
        id: asPhotonEntryId(entry.id)
      }
    : entry
}

export function serverEntryPlugin(): Plugin[] {
  const resolvedPlugins = new Map<string, SupportedServers>()
  const photonEntries = new Set<string>()
  let serverEntryInjected = false

  return [
    {
      name: 'photonjs:resolve-entry-meta',
      enforce: 'pre',

      applyToEnvironment(env) {
        return env.name === 'ssr'
      },

      resolveId: {
        order: 'post',
        async handler(id, importer, opts) {
          const resolved =
            importer && isPhotonEntryId(importer)
              ? await this.resolve(id, stripPhotonEntryId(importer), {
                  ...opts,
                  skipSelf: false
                })
              : isPhotonEntryId(id)
                ? await this.resolve(stripPhotonEntryId(id), importer, {
                    ...opts,
                    isEntry: true,
                    skipSelf: false
                  })
                : null

          if (resolved) {
            if (isPhotonEntryId(id)) {
              photonEntries.add(resolved.id)

              if (!opts.custom?.simple) {
                console.log('LOADING', id, resolved)
                const loaded = await loadGraphAndExtractMeta(this, resolvedPlugins, stripPhotonEntryId(id))
                console.log('LOADED', loaded)
              }
            }
            console.log('RESOLED', id, resolved, importer)
            return {
              ...resolved,
              resolvedBy: 'photonjs'
            }
          }
        }
      },
      // load: {
      //   order: 'pre',
      //   async handler(id) {
      //     // TODO use `resolvedBy` or `meta` prop?
      //     if (isPhotonEntryId(id) || photonEntries.has(id)) {
      //       const loaded = await this.load({ id })
      //       console.log('LOADING', id, loaded)
      //       return loaded
      //       return loadGraphAndExtractMeta(this, resolvedPlugins, stripPhotonEntryId(id)) as any
      //     }
      //   }
      // },
      sharedDuringBuild: true
    },
    {
      name: 'photonjs:server-type-resolve-helper',
      enforce: 'pre',
      async resolveId(id, importer, opts) {
        if (id in idsToServers) {
          const resolved = await this.resolve(id, importer, opts)
          if (resolved) {
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            resolvedPlugins.set(resolved.id, idsToServers[id]!)
          }
        }
      },
      sharedDuringBuild: true
    },
    {
      name: 'vike-server:serverEntry',
      apply: 'build',

      applyToEnvironment(env) {
        return env.name === 'ssr'
      },

      buildStart() {
        const vikeServerConfig = getVikeServerConfig(this.environment.config)
        const { entry } = vikeServerConfig

        for (const [name, photonEntry] of Object.entries(entry)) {
          assertPhotonEntryId(photonEntry.id)
          this.emitFile({
            type: 'chunk',
            fileName: `${name}.js`,
            id: photonEntry.id,
            importer: undefined
          })
        }
      },

      buildEnd() {
        assert(serverEntryInjected)
      },

      transform(code, id) {
        if (isPhotonEntryId(id) || photonEntries.has(id)) {
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
