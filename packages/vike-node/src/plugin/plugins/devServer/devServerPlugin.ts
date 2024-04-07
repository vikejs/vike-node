export { devServerPlugin }

import pc from '@brillout/picocolors'
import { BirpcReturn, createBirpc } from 'birpc'
import { ChildProcess, fork } from 'child_process'
import { EnvironmentModuleNode, HMRChannel, ModuleNode, Plugin, ViteDevServer } from 'vite'
import { ConfigVikeNodeResolved } from '../../../types.js'
import { assert } from '../../../utils/assert.js'
import { getConfigVikeNode } from '../../utils/getConfigVikeNode.js'
import { logViteInfo } from '../../utils/logVite.js'
import { viteHmrPort, viteMiddlewareProxyPort } from './constants.js'
import { bindCLIShortcuts } from './shortcuts.js'
import type { ClientFunctions, MinimalModuleNode, ServerFunctions, WorkerData } from './types.js'

const workerPath = new URL('./worker.js', import.meta.url).pathname

let ws: HMRChannel | undefined
let vite: ViteDevServer
let rpc: BirpcReturn<ClientFunctions, ServerFunctions>
let cp: ChildProcess | undefined
let entryAbs: string

function devServerPlugin(): Plugin {
  let resolvedConfig: ConfigVikeNodeResolved
  return {
    name: 'vike-node:devserver',
    apply: 'serve',
    enforce: 'post',
    config() {
      return {
        server: {
          port: viteMiddlewareProxyPort,
          hmr: {
            // this needs to be exposed in containers
            port: viteHmrPort
          }
        }
      }
    },
    configResolved(config) {
      resolvedConfig = getConfigVikeNode(config)
      assert(resolvedConfig.server)
    },
    async hotUpdate(ctx) {
      console.log(ctx.environment.name, ctx.modules, ctx.type)
      if (ctx.environment.name !== 'ssr') {
        return
      }

      if (!cp) {
        await restartWorker()
        ctx.server.environments.client.hot.send({ type: 'full-reload' })
        return []
      }

      if (!ctx.modules.length) return []
      const mods = ctx.modules.map((m) => m.id).filter(Boolean) as string[]
      await rpc.invalidateDepTree(mods)
      const modules = new Set(ctx.modules)
      let shouldRestart = false
      for (const module of modules) {
        if (module.file === entryAbs) {
          shouldRestart = true
          break
        }

        for (const importerInner of module.importers) {
          modules.add(importerInner)
        }
      }

      if (shouldRestart) {
        await restartWorker()
        ctx.server.environments.client.hot.send({ type: 'full-reload' })
      }

      return []
    },
    // called on start & vite.config.js changes
    configureServer(vite_) {
      vite = vite_
      ws = vite.environments.client.hot
      vite.bindCLIShortcuts = () =>
        bindCLIShortcuts({
          onRestart: async () => {
            if (await restartWorker()) {
              ws?.send({
                type: 'full-reload'
              })
            }
          }
        })
      vite.printUrls = () => {}
      restartWorker()
    }
  }

  async function restartWorker() {
    if (cp) {
      await new Promise((resolve) => {
        cp!.once('exit', resolve)
        cp!.kill()
      })
    }

    assert(resolvedConfig.server)
    const index = resolvedConfig.server.entry.index

    const originalInvalidateModule = vite.moduleGraph.invalidateModule.bind(vite.moduleGraph)
    vite.moduleGraph.invalidateModule = (mod, ...rest) => {
      if (mod.id) {
        // timeout error
        rpc.deleteByModuleId(mod.id).catch(() => {})
      }
      return originalInvalidateModule(mod, ...rest)
    }

    const indexResolved = await vite.pluginContainer.resolveId(index, undefined)
    assert(indexResolved?.id)
    entryAbs = indexResolved.id

    //@ts-ignore
    const configVikePromise = await vite.config.configVikePromise

    const workerData: WorkerData = {
      entry: entryAbs,
      viteConfig: { root: vite.config.root, configVikePromise }
    }
    cp = fork(workerPath, {
      env: process.env,
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      serialization: 'advanced'
    })

    rpc = createBirpc<ClientFunctions, ServerFunctions>(
      {
        async fetchModule(id, importer) {
          const result = await vite.environments.ssr.fetchModule(id, importer)
          if (resolvedConfig.server.native.includes(id)) {
            // sharp needs to load the .node file on this thread for some reason
            // maybe it's the case for other natives as well
            // update: maybe it's fixed
            // await import(id)
          }
          return result
        },
        moduleGraphResolveUrl(url: string) {
          return vite.environments.ssr.moduleGraph.resolveUrl(url)
        },
        moduleGraphGetModuleById(id: string) {
          const module = vite.environments.ssr.moduleGraph.getModuleById(id)
          if (!module) {
            return module
          }
          return convertToMinimalModuleNode(module)
        },
        transformIndexHtml(url: string, html: string, originalUrl?: string) {
          return vite.transformIndexHtml(url, html, originalUrl)
        }
      },
      {
        // lazy
        post: (data) => cp?.send(data),
        // eager
        on: (data) => cp!.on('message', data),
        timeout: 1000
      }
    )

    cp.once('exit', (code) => {
      if (code) {
        logViteInfo(`Server shutdown. Update a server file, or press ${pc.cyan('r + Enter')}, to restart.`)
      }

      cp = undefined
    })

    return rpc
      .start(workerData)
      .then(() => true)
      .catch(() => false)
  }
}

// This is the minimal representation the Vike runtime needs
function convertToMinimalModuleNode(
  node: EnvironmentModuleNode ,
  cache: Map<EnvironmentModuleNode, MinimalModuleNode> = new Map()
): MinimalModuleNode {
  // If the node is in the cache, return the cached version
  if (cache.has(node)) {
    return cache.get(node)!
  }

  // Create a new MinimalModuleNode object
  const minimalNode: MinimalModuleNode = {
    id: node.id,
    url: node.url,
    type: node.type,
    importedModules: new Set<MinimalModuleNode>()
  }

  // Add the new node to the cache
  cache.set(node, minimalNode)

  // Convert each imported module to a MinimalModuleNode
  for (const importedModule of node.importedModules) {
    minimalNode.importedModules.add(convertToMinimalModuleNode(importedModule, cache))
  }

  return minimalNode
}
