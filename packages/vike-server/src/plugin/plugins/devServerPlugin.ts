import { createServer, type IncomingMessage, type Server } from 'node:http'
import {
  type DevEnvironment,
  type EnvironmentModuleNode,
  isRunnableDevEnvironment,
  type Plugin,
  type ViteDevServer
} from 'vite'

import { globalStore } from '../../runtime/globalStore.js'
import type { ConfigVikeServerResolved } from '../../types.js'
import { assert } from '../../utils/assert.js'
import { isBun } from '../utils/isBun.js'
import { logViteInfo } from '../utils/logVite.js'
import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'

let fixApplied = false

const VITE_HMR_PATH = '/__vite_hmr'

export function devServerPlugin(): Plugin {
  let vikeServerConfig: ConfigVikeServerResolved
  let resolvedEntryId: string
  let HMRServer: ReturnType<typeof createServer> | undefined
  let viteDevServer: ViteDevServer
  let setupHMRProxyDone = false
  return {
    name: 'vite-node:devserver',
    apply(_config, { command, mode }) {
      return command === 'serve' && mode !== 'test'
    },
    enforce: 'pre',
    async config() {
      // FIXME
      if (isBun) {
        return {
          server: {
            middlewareMode: true
          }
        }
      }

      HMRServer = createServer()
      return {
        server: {
          middlewareMode: true,
          hmr: {
            server: HMRServer,
            path: VITE_HMR_PATH
          }
        }
      }
    },

    configResolved(config) {
      vikeServerConfig = getVikeServerConfig(config)
    },

    async hotUpdate(ctx) {
      const imported = isImported(ctx.modules)
      if (imported) {
        const invalidatedModules = new Set<EnvironmentModuleNode>()
        for (const mod of ctx.modules) {
          this.environment.moduleGraph.invalidateModule(mod, invalidatedModules, ctx.timestamp, true)
        }

        invalidateEntry(this.environment, invalidatedModules, ctx.timestamp, true)
        // Wait for updated file to be ready
        await ctx.read()

        this.environment.hot.send({ type: 'full-reload' })
        return []
      }
    },

    configureServer(vite) {
      if (viteDevServer) {
        return
      }

      // Once existing server is closed and invalidated, reimport its updated entry file
      vite.environments.ssr.hot.on('vike-server:server-closed', () => {
        setupHMRProxyDone = false
        if (isRunnableDevEnvironment(vite.environments.ssr)) {
          vite.environments.ssr.runner.import(resolvedEntryId).catch(logRestartMessage)
        }
      })

      vite.environments.ssr.hot.on('vike-server:reloaded', () => {
        vite.environments.client.hot.send({ type: 'full-reload' })
      })

      viteDevServer = vite
      globalStore.viteDevServer = vite
      globalStore.setupHMRProxy = setupHMRProxy
      if (!fixApplied) {
        fixApplied = true
        setupErrorStackRewrite(vite)
        setupErrorHandlers()
      }
      patchViteServer(vite)
      initializeServerEntry(vite)
    }
  }

  function invalidateEntry(
    env: DevEnvironment,
    invalidatedModules?: Set<EnvironmentModuleNode>,
    timestamp?: number,
    isHmr?: boolean
  ) {
    const entryModule = env.moduleGraph.getModuleById(resolvedEntryId)
    if (entryModule) {
      // Always invalidate server entry so that
      env.moduleGraph.invalidateModule(entryModule, invalidatedModules, timestamp, isHmr)
    }
  }

  function setupHMRProxy(req: IncomingMessage) {
    if (setupHMRProxyDone || isBun) {
      return false
    }

    setupHMRProxyDone = true
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const server = (req.socket as any).server as Server
    server.on('upgrade', (clientReq, clientSocket, wsHead) => {
      if (isHMRProxyRequest(clientReq)) {
        assert(HMRServer)
        HMRServer.emit('upgrade', clientReq, clientSocket, wsHead)
      }
    })
    // true if we need to send an empty Response waiting for the upgrade
    return isHMRProxyRequest(req)
  }

  function isHMRProxyRequest(req: IncomingMessage) {
    if (req.url === undefined) {
      return false
    }
    const url = new URL(req.url, 'http://example.com')
    return url.pathname === VITE_HMR_PATH
  }

  function isImported(
    modules: EnvironmentModuleNode[]
  ): { type: 'entry' | '+middleware'; module: EnvironmentModuleNode } | undefined {
    const modulesSet = new Set(modules)
    for (const module of modulesSet.values()) {
      if (module.file === resolvedEntryId)
        return {
          type: 'entry',
          module
        }
      if (module.file?.match(/\+middleware\.[mc]?[jt]sx?$/))
        return {
          type: '+middleware',
          module
        }
      // biome-ignore lint/complexity/noForEach: <explanation>
      module.importers.forEach((importer) => modulesSet.add(importer))
    }
  }

  function patchViteServer(vite: ViteDevServer) {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    vite.httpServer = { on: () => {} } as any
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    vite.listen = (() => {}) as any
    vite.printUrls = () => {}
    const originalClose = vite.close
    vite.close = async () => {
      invalidateEntry(vite.environments.ssr)

      return new Promise<void>((resolve, reject) => {
        const onClose = () => {
          vite.environments.ssr.hot.off('vike-server:server-closed', onClose)
          originalClose().then(resolve).catch(reject)
        }

        vite.environments.ssr.hot.on('vike-server:server-closed', onClose)
        // The server files should listen to this event to know when to close before hot-reloading
        vite.environments.ssr.hot.send({ type: 'custom', event: 'vike-server:close-server' })
      })
    }
  }

  async function initializeServerEntry(vite: ViteDevServer) {
    assert(vikeServerConfig)
    const { index } = vikeServerConfig.entry
    const indexResolved = await vite.pluginContainer.resolveId(index as string)
    assert(indexResolved?.id)
    resolvedEntryId = indexResolved.id
    const ssr = vite.environments.ssr
    if (isRunnableDevEnvironment(ssr)) {
      ssr.runner.import(indexResolved.id).catch(logRestartMessage)
    }
  }
}

function logRestartMessage() {
  logViteInfo('Server crash: Update a server file or type "r+enter" to restart the server.')
}

function setupErrorStackRewrite(vite: ViteDevServer) {
  const rewroteStacktraces = new WeakSet()

  const _prepareStackTrace = Error.prepareStackTrace
  Error.prepareStackTrace = function prepareStackTrace(error: Error, stack: NodeJS.CallSite[]) {
    let ret = _prepareStackTrace?.(error, stack)
    if (!ret) return ret
    try {
      ret = vite.ssrRewriteStacktrace(ret)
      rewroteStacktraces.add(error)
    } catch (e) {
      console.debug('Failed to apply Vite SSR stack trace fix:', e)
    }
    return ret
  }

  const _ssrFixStacktrace = vite.ssrFixStacktrace
  vite.ssrFixStacktrace = function ssrFixStacktrace(e) {
    if (rewroteStacktraces.has(e)) return
    _ssrFixStacktrace(e)
  }
}

function setupErrorHandlers() {
  function onError(err: unknown) {
    console.error(err)
    logRestartMessage()
  }

  process.on('unhandledRejection', onError)
  process.on('uncaughtException', onError)
}
