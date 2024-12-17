import { fork } from 'child_process'
import { type IncomingMessage, type Server, createServer } from 'http'
import type { Plugin, ViteDevServer } from 'vite'
import { globalStore } from '../../runtime/globalStore.js'
import type { ConfigVikeNodeResolved } from '../../types.js'
import { assert } from '../../utils/assert.js'
import { getConfigVikeNode } from '../utils/getConfigVikeNode.js'
import { isBun } from '../utils/isBun.js'
import { logViteInfo } from '../utils/logVite.js'

let viteDevServer: ViteDevServer
const VITE_HMR_PATH = '/__vite_hmr'
const RESTART_EXIT_CODE = 33
const IS_RESTARTER_SET_UP = '__VIKE__IS_RESTARTER_SET_UP'

export function devServerPlugin(): Plugin {
  let resolvedConfig: ConfigVikeNodeResolved
  let entryAbs: string
  let HMRServer: ReturnType<typeof createServer> | undefined
  let setupHMRProxyDone = false
  return {
    name: 'vite-node:devserver',
    apply(_config, { command, mode }) {
      return command === 'serve' && mode !== 'test'
    },
    enforce: 'pre',
    config: async () => {
      await setupProcessRestarter()

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

    handleHotUpdate(ctx) {
      if (isImported(ctx.file)) {
        restartProcess()
      }
    },

    configureServer(vite) {
      if (viteDevServer) {
        restartProcess()
        return
      }

      viteDevServer = vite
      globalStore.viteDevServer = vite
      globalStore.setupHMRProxy = setupHMRProxy
      patchViteServer(vite)
      setupErrorStrackRewrite(vite)
      setupErrorHandlers()
      initializeServerEntry(vite)
    }
  }

  function isImported(id: string): boolean {
    const moduleNode = viteDevServer.moduleGraph.getModuleById(id)
    if (!moduleNode) {
      return false
    }
    const modules = new Set([moduleNode])
    for (const module of modules) {
      if (module.file === entryAbs) return true
      module.importers.forEach((importer) => modules.add(importer))
    }

    return false
  }

  function patchViteServer(vite: ViteDevServer) {
    vite.httpServer = { on: () => {} } as any
    vite.listen = (() => {}) as any
    vite.printUrls = () => {}
  }

  async function initializeServerEntry(vite: ViteDevServer) {
    assert(resolvedConfig.server)
    const { index } = resolvedConfig.server.entry
    const indexResolved = await vite.pluginContainer.resolveId(index.entry)
    assert(indexResolved?.id)
    entryAbs = indexResolved.id
    vite.ssrLoadModule(entryAbs).catch(logRestartMessage)
  }

  function setupHMRProxy(req: IncomingMessage) {
    if (setupHMRProxyDone || isBun) {
      return false
    }

    setupHMRProxyDone = true
    const server = (req.socket as any).server as Server
    server.on('upgrade', (clientReq, clientSocket, wsHead) => {
      if (clientReq.url === VITE_HMR_PATH) {
        assert(HMRServer)
        HMRServer.emit('upgrade', clientReq, clientSocket, wsHead)
      }
    })
    // true if we need to send an empty Response waiting for the upgrade
    return req.url === VITE_HMR_PATH
  }
}

function logRestartMessage() {
  logViteInfo('Server crash: Update a server file or type "r+enter" to restart the server.')
}

function setupErrorStrackRewrite(vite: ViteDevServer) {
  const rewroteStacktraces = new WeakSet()

  const _prepareStackTrace = Error.prepareStackTrace
  Error.prepareStackTrace = function prepareStackTrace(error, stack) {
    let ret = _prepareStackTrace?.(error, stack)
    if (!ret) return ret
    try {
      ret = vite.ssrRewriteStacktrace(ret)
      rewroteStacktraces.add(error)
    } catch (e) {
      console.warn('Failed to apply Vite SSR stack trace fix:', e)
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

// We hijack the CLI root process: we block Vite and make it orchestrates server restarts instead.
// We execute the CLI again as a child process which does the actual work.
async function setupProcessRestarter() {
  if (isRestarterSetUp()) return
  process.env[IS_RESTARTER_SET_UP] = 'true'

  function start() {
    const cliEntry = process.argv[1]!
    const cliArgs = process.argv.slice(2)
    // Re-run the exact same CLI
    const clone = fork(cliEntry, cliArgs, { stdio: 'inherit' })
    clone.on('exit', (code) => {
      if (code === RESTART_EXIT_CODE) {
        start()
      } else {
        process.exit(code)
      }
    })
  }
  start()

  // Trick: never-resolving-promise in order to block the CLI root process
  await new Promise(() => {})
}

function isRestarterSetUp() {
  return process.env[IS_RESTARTER_SET_UP] === 'true'
}

function restartProcess() {
  logViteInfo('Restarting server...')
  assert(isRestarterSetUp())
  process.exit(RESTART_EXIT_CODE)
}
