import { createServer, type IncomingMessage, type Server } from 'node:http'
import { type EnvironmentModuleNode, isRunnableDevEnvironment, type Plugin, type ViteDevServer } from 'vite'
import { globalStore } from '../../runtime/globalStore.js'
import type { ConfigVikeNodeResolved } from '../../types.js'
import { assert } from '../../utils/assert.js'
import { getConfigVikeNode } from '../utils/getConfigVikeNode.js'
import { isBun } from '../utils/isBun.js'
import { logViteInfo } from '../utils/logVite.js'

let fixApplied = false

const VITE_HMR_PATH = '/__vite_hmr'

export function devServerPlugin(): Plugin {
  let resolvedConfig: ConfigVikeNodeResolved
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
      resolvedConfig = getConfigVikeNode(config)
    },

    hotUpdate(ctx) {
      if (isImported(ctx.file)) {
        const invalidatedModules = new Set<EnvironmentModuleNode>()
        for (const mod of ctx.modules) {
          this.environment.moduleGraph.invalidateModule(mod, invalidatedModules, ctx.timestamp, true)
        }
        console.log('SENDING HMR EVENT', this.environment.name)
        // The server files should listen to this event to know when to close before hot-reloading
        this.environment.hot.send({ type: 'custom', event: 'vike-server:close-server' })

        return []
      }
    },

    configureServer(vite) {
      if (viteDevServer) {
        return
      }

      // Once existing server is closed and invalidated, reimport its updated entry file
      vite.environments.ssr.hot.on('vike-server:server-closed', () => {
        console.log('received', 'vike-server:server-closed')
        setupHMRProxyDone = false
        if (isRunnableDevEnvironment(vite.environments.ssr)) {
          vite.environments.ssr.runner.import(resolvedEntryId).catch(logRestartMessage)
        }
      })

      // Once we confirm that the server file is reloaded, tells client to refresh
      vite.environments.ssr.hot.on('vike-server:reloaded', () => {
        console.log('received', 'vike-server:reloaded')
        vite.environments.client.hot.send({ type: 'full-reload' })
      })

      viteDevServer = vite
      globalStore.viteDevServer = vite
      globalStore.setupHMRProxy = setupHMRProxy
      if (!fixApplied) {
        fixApplied = true
        patchViteServer(vite)
        setupErrorStackRewrite(vite)
        setupErrorHandlers()
      }
      initializeServerEntry(vite)
    }
  }

  function setupHMRProxy(req: IncomingMessage) {
    if (setupHMRProxyDone || isBun) {
      return false
    }

    console.log('setupHMRProxy')

    setupHMRProxyDone = true
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const server = (req.socket as any).server as Server
    server.on('upgrade', (clientReq, clientSocket, wsHead) => {
      console.log('upgrade', clientReq.url)
      if (isHMRProxyRequest(clientReq)) {
        console.log('setupHMRProxy', 'isHMRProxyRequest')
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

  // FIXME: does not return true when editing +middleware file
  // TODO: could we just invalidate imports instead of restarting process?
  function isImported(id: string): boolean {
    const moduleNode = viteDevServer?.moduleGraph.getModuleById(id)
    if (!moduleNode) {
      return false
    }
    const modules = new Set([moduleNode])
    for (const module of modules) {
      if (module.file === resolvedEntryId) return true
      // biome-ignore lint/complexity/noForEach: <explanation>
      module.importers.forEach((importer) => modules.add(importer))
    }

    return false
  }

  function patchViteServer(vite: ViteDevServer) {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    vite.httpServer = { on: () => {} } as any
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    vite.listen = (() => {}) as any
    vite.printUrls = () => {}
    const originalClose = vite.close
    // FIXME trying to override vike.close to handle r+enter Vite restart shortcut
    //  currently generates errors
    vite.close = async () => {
      vite.environments.ssr.hot.send({ type: 'custom', event: 'vike-server:close-server' })

      return new Promise((resolve, reject) => {
        const onClose = () => {
          vite.environments.ssr.hot.off('vike-server:server-closed', onClose)
          originalClose().then(resolve).catch(reject)
        }

        vite.environments.ssr.hot.on('vike-server:server-closed', onClose)
      })
    }
  }

  async function initializeServerEntry(vite: ViteDevServer) {
    assert(resolvedConfig.server)
    const { index } = resolvedConfig.server.entry
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
  logViteInfo('Server crash: Update a server file or restart the server.')
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
