import type { Plugin } from 'vite'
import { assertUsage } from '../../utils/assert.js'
import type { SupportedServers } from '../../types.js'
import { assertPhotonEntryId, isPhotonEntryId, isPhotonMeta, stripPhotonEntryId } from '../utils/entry.js'
import type { ModuleInfo, PluginContext } from 'rollup'

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

function computePhotonMeta(
  pluginContext: PluginContext,
  resolvedIdsToServers: Record<string, SupportedServers>,
  info: ModuleInfo
) {
  assertUsage(!info.isExternal, `Entry should not be external: ${info.id}`)
  // early return for better performance
  if (isPhotonMeta(info.meta) && info.meta.photonjs.type && info.meta.photonjs.type !== 'auto') return
  const graph = new Set([...info.importedIdResolutions, ...info.dynamicallyImportedIdResolutions])

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
  // TODO also update env config
  // pluginContext.environment.config.photonjs.entry[...] = ...
}

export function photonEntryPlugin(): Plugin[] {
  let resolvedIdsToServers: Record<string, SupportedServers>

  return [
    {
      name: 'photonjs:set-entry',
      apply: 'build',
      enforce: 'pre',

      applyToEnvironment(env) {
        return env.config.consumer === 'server'
      },

      async buildStart() {
        resolvedIdsToServers = await resolveIdsToServers(this)
        const { entry } = this.environment.config.photonjs

        for (const [name, photonEntry] of Object.entries(entry)) {
          assertPhotonEntryId(photonEntry.id)
          this.emitFile({
            type: 'chunk',
            fileName: `${name}.js`,
            id: photonEntry.id
          })
        }
      },

      moduleParsed(info) {
        if (isPhotonMeta(info.meta)) {
          // Must be kept sync
          computePhotonMeta(this, resolvedIdsToServers, info)
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
    }
  ]
}
