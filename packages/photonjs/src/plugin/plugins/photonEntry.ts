import type { Plugin } from 'vite'
import { assert, assertUsage } from '../../utils/assert.js'
import type { PhotonEntryServer, SupportedServers } from '../../types.js'
import { assertPhotonEntryId, isPhotonEntryId, isPhotonMeta, stripPhotonEntryId } from '../utils/entry.js'
import type { ModuleInfo, PluginContext } from 'rollup'

const idsToServers: Record<string, SupportedServers> = {
  '@photonjs/hono': 'hono',
  '@photonjs/hattip': 'hattip',
  '@photonjs/express': 'express',
  '@photonjs/fastify': 'fastify',
  '@photonjs/h3': 'h3',
  '@photonjs/elysia': 'elysia'
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

  const entry = Object.values(pluginContext.environment.config.photonjs.entry).find((e) => e.resolvedId === info.id)
  assert(entry)

  if (found) {
    if (!info.hasDefaultExport) {
      // TODO better error message with link to documentation
      pluginContext.error(`Entry "${info.id}" seems to use "${found}", but no default export was found`)
    }
    info.meta ??= {}
    info.meta.photonjs ??= {}
    info.meta.photonjs.type = 'server'
    info.meta.photonjs.server = found
    entry.type = info.meta.photonjs.type
    ;(entry as typeof PhotonEntryServer.infer).server = info.meta.photonjs.server
  } else if (info.hasDefaultExport) {
    info.meta.photonjs.type = 'universal-handler'
    entry.type = info.meta.photonjs.type
  } else {
    // TODO better error message with link to documentation
    pluginContext.error(
      `Cannot guess "${info.id}" entry type. Make sure to provide a default export, and if you use a server, use "@photonjs/<server>" package`
    )
  }
}

export function photonEntry(): Plugin[] {
  const resolvedIdsToServers: Record<string, SupportedServers> = {}

  return [
    {
      name: 'photonjs:set-entry',
      apply: 'build',
      enforce: 'pre',

      applyToEnvironment(env) {
        return env.config.consumer === 'server'
      },

      buildStart() {
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

      async resolveId(id, importer, opts) {
        if (id in idsToServers) {
          const resolved = await this.resolve(id, importer, opts)
          if (resolved) {
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            resolvedIdsToServers[resolved.id] = idsToServers[id]!
          }
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
              const entry = Object.values(this.environment.config.photonjs.entry).find((e) => e.id === id)
              assert(entry)
              entry.resolvedId = resolved.id

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
