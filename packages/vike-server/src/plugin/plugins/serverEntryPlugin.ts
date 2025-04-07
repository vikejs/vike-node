import MagicString from 'magic-string'
import { serverEntryVirtualId, type VitePluginServerEntryOptions } from '@brillout/vite-plugin-server-entry/plugin'
import type { Plugin } from 'vite'
import { assert, assertUsage } from '../../utils/assert.js'
import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'
import type { SupportedServers } from '../../types.js'
import { assertPhotonEntryId, isPhotonEntryId, isPhotonMeta, stripPhotonEntryId } from '../utils/entry.js'
import type { ModuleInfo, PluginContext } from 'rollup'

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

async function resolveIdsToServers(pluginContext: PluginContext): Promise<Record<string, SupportedServers>> {
  const resolvedIdsToServers: Record<string, SupportedServers> = {}
  for (const [key, value] of Object.entries(idsToServers)) {
    const resolved = await pluginContext.resolve(key)
    if (resolved) {
      resolvedIdsToServers[resolved.id] = value
    }
  }
  return resolvedIdsToServers
}

async function computePhotonMeta(pluginContext: PluginContext, info: ModuleInfo) {
  assertUsage(!info.isExternal, `Entry should not be external: ${info.id}`)
  // early return for better performance
  if (isPhotonMeta(info.meta) && info.meta.photonjs.type && info.meta.photonjs.type !== 'auto') return
  const graph = new Set([...info.importedIdResolutions, ...info.dynamicallyImportedIdResolutions])
  const resolvedIdsToServers = await resolveIdsToServers(pluginContext)

  let found: SupportedServers | undefined
  for (const imported of graph.values()) {
    found = resolvedIdsToServers[imported.id]
    if (found) break
    if (imported.external) continue
    const sub = pluginContext.getModuleInfo(imported.id)
    if (sub) {
      for (const imp of [...sub.importedIdResolutions, ...sub.dynamicallyImportedIdResolutions]) {
        graph.add(imp)
      }
    }
  }

  if (found) {
    info.meta ??= {}
    info.meta.photonjs ??= {}
    info.meta.photonjs.type = 'server'
    info.meta.photonjs.server = found
  } else {
    info.meta.photonjs.type = 'universal-handler'
  }
}

export function serverEntryPlugin(): Plugin[] {
  let serverEntryInjected = false

  return [
    {
      name: 'photonjs:set-entry-meta',
      apply: 'build',
      enforce: 'pre',

      applyToEnvironment(env) {
        return env.config.consumer === 'server'
      },

      async moduleParsed(info) {
        if (isPhotonMeta(info.meta)) {
          await computePhotonMeta(this, info)
        }
      },

      sharedDuringBuild: true
    },
    {
      name: 'photonjs:resolve-entry-meta',
      enforce: 'pre',

      applyToEnvironment(env) {
        return env.config.consumer === 'server'
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
              return {
                ...resolved,
                meta: {
                  photonjs: {
                    type: 'auto'
                  }
                },
                resolvedBy: 'photonjs'
              }
            }
            return resolved
          }
        }
      },
      sharedDuringBuild: true
    },
    {
      name: 'vike-server:serverEntry',
      apply: 'build',

      applyToEnvironment(env) {
        return env.config.consumer === 'server'
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
        if (isPhotonMeta(this.getModuleInfo(id)?.meta)) {
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
