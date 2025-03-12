import { createServer } from 'node:http'
import { type EnvironmentModuleNode, isRunnableDevEnvironment, type Plugin, type ViteDevServer } from 'vite'
import { globalStore } from '../../runtime/globalStore.js'
import type { ConfigVikeNodeResolved } from '../../types.js'
import { assert } from '../../utils/assert.js'
import { getConfigVikeNode } from '../utils/getConfigVikeNode.js'
import { isBun } from '../utils/isBun.js'
import { logViteInfo } from '../utils/logVite.js'
import type { AddressInfo } from 'node:net'

let fixApplied = false;
export function devServerPlugin(): Plugin {
  let resolvedConfig: ConfigVikeNodeResolved;
  let resolvedEntryId: string;
  let HMRServer: ReturnType<typeof createServer> | undefined;
  let clientPort = 0;
  let viteDevServer: ViteDevServer;
  return {
    name: "vite-node:devserver",
    apply(_config, { command, mode }) {
      return command === "serve" && mode !== "test";
    },
    enforce: "pre",
    async config() {
      // FIXME
      if (isBun) {
        return {
          server: {
            middlewareMode: true,
          },
        };
      }

      HMRServer = createServer();
      return {
        server: {
          middlewareMode: true,
          hmr: {
            get clientPort() {
              const port = (HMRServer?.address() as AddressInfo | undefined)?.port;
              clientPort = port ?? clientPort;
              console.log("clientPort", clientPort);
              return clientPort;
            },
            server: HMRServer,
          },
        },
      };
    },

    configResolved(config) {
      resolvedConfig = getConfigVikeNode(config);
    },

    hotUpdate(ctx) {
      if (isImported(ctx.file)) {
        const invalidatedModules = new Set<EnvironmentModuleNode>();
        for (const mod of ctx.modules) {
          this.environment.moduleGraph.invalidateModule(mod, invalidatedModules, ctx.timestamp, true);
        }
        console.log("SENDING HMR EVENT", this.environment.name);
        this.environment.hot.send({ type: "custom", event: "vike-server:close-server" });

        return [];
      }
    },

    configureServer(vite) {
      if (viteDevServer) {
        return;
      }

      HMRServer?.listen(clientPort ?? 0);

      vite.hot.on("vite:beforeFullReload", () => {
        console.log("Server is restarting!");
      });

      vite.environments.ssr.hot.on("vike-server:server-closed", () => {
        console.log("received", "vike-server:server-closed");
        if (isRunnableDevEnvironment(vite.environments.ssr)) {
          vite.environments.ssr.runner.import(resolvedEntryId).catch(logRestartMessage);
        }
      });

      vite.environments.ssr.hot.on("vike-server:reloaded", () => {
        console.log("received", "vike-server:reloaded");
        vite.environments.client.hot.send({ type: "full-reload" });
      });

      viteDevServer = vite;
      globalStore.viteDevServer = vite;
      if (!fixApplied) {
        fixApplied = true;
        patchViteServer(vite);
        setupErrorStackRewrite(vite);
        setupErrorHandlers();
      }
      initializeServerEntry(vite);
    },
  };

  // FIXME: does not return true when editing +middleware file
  // TODO: could we just invalidate imports instead of restarting process?
  function isImported(id: string): boolean {
    const moduleNode = viteDevServer?.moduleGraph.getModuleById(id);
    if (!moduleNode) {
      return false;
    }
    const modules = new Set([moduleNode]);
    for (const module of modules) {
      if (module.file === resolvedEntryId) return true;
      // biome-ignore lint/complexity/noForEach: <explanation>
      module.importers.forEach((importer) => modules.add(importer));
    }

    return false;
  }

  function patchViteServer(vite: ViteDevServer) {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    vite.httpServer = { on: () => {} } as any;
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    vite.listen = (() => {}) as any;
    vite.printUrls = () => {};
    const originalClose = vite.close;
    vite.close = async () => {
      vite.environments.ssr.hot.send({ type: "custom", event: "vike-server:close-server" });

      return new Promise((resolve, reject) => {
        const onClose = () => {
          vite.environments.ssr.hot.off("vike-server:server-closed", onClose);
          originalClose().then(resolve).catch(reject);
        };

        vite.environments.ssr.hot.on("vike-server:server-closed", onClose);
      });
    };
  }

  async function initializeServerEntry(vite: ViteDevServer) {
    assert(resolvedConfig.server);
    const { index } = resolvedConfig.server.entry;
    const indexResolved = await vite.pluginContainer.resolveId(index as string);
    assert(indexResolved?.id);
    resolvedEntryId = indexResolved.id;
    const ssr = vite.environments.ssr;
    if (isRunnableDevEnvironment(ssr)) {
      ssr.runner.import(indexResolved.id).catch(logRestartMessage);
    }
  }
}

function logRestartMessage() {
  logViteInfo("Server crash: Update a server file or restart the server.");
}

function setupErrorStackRewrite(vite: ViteDevServer) {
  const rewroteStacktraces = new WeakSet();

  const _prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = function prepareStackTrace(error: Error, stack: NodeJS.CallSite[]) {
    let ret = _prepareStackTrace?.(error, stack);
    if (!ret) return ret;
    try {
      ret = vite.ssrRewriteStacktrace(ret);
      rewroteStacktraces.add(error);
    } catch (e) {
      console.debug("Failed to apply Vite SSR stack trace fix:", e);
    }
    return ret;
  };

  const _ssrFixStacktrace = vite.ssrFixStacktrace;
  vite.ssrFixStacktrace = function ssrFixStacktrace(e) {
    if (rewroteStacktraces.has(e)) return;
    _ssrFixStacktrace(e);
  };
}

function setupErrorHandlers() {
  function onError(err: unknown) {
    console.error(err);
    logRestartMessage();
  }

  process.on("unhandledRejection", onError);
  process.on("uncaughtException", onError);
}
