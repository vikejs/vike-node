// taken from https://github.com/cloudflare/workers-sdk/blob/e24939c53475228e12a3c5228aa652c6473a889f/packages/wrangler/src/deployment-bundle/esbuild-plugins/hybrid-nodejs-compat.ts

export { unenvPlugin }

import type { Plugin, PluginBuild } from 'esbuild'
import { builtinModules, createRequire } from 'node:module'
import nodePath from 'node:path'
import { cloudflare, deno, env, node, nodeless, vercel } from 'unenv-nightly'
import type { Runtime } from '../../../types.js'
import { assert } from '../../../utils/assert.js'
import { packagePath } from '../../utils/version.js'

const require_ = createRequire(import.meta.url)

const REQUIRED_NODE_BUILT_IN_NAMESPACE = 'node-built-in-modules'

function getEnv(runtime: Runtime) {
  switch (runtime) {
    case 'node':
      return env(node)
    case 'nodeless':
      return env(nodeless)
    case 'deno':
      return env(nodeless, deno)
    case 'cloudflare':
      return env(nodeless, cloudflare)
    case 'vercel':
      return env(nodeless, vercel)
    default:
      assert(false)
  }
}

//@ts-ignore
function replaceUnenv(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/\bunenv\b/g, 'unenv-nightly')
  } else if (Array.isArray(obj)) {
    return obj.map(replaceUnenv)
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj = {}
    for (const [key, value] of Object.entries(obj)) {
      //@ts-ignore
      newObj[key] = replaceUnenv(value)
    }
    return newObj
  }
  return obj
}

function unenvPlugin(runtime: Runtime): Plugin {
  const { alias, inject, external, polyfill } = replaceUnenv(getEnv(runtime))

  delete inject.global
  delete inject.process
  delete inject.Buffer

  return {
    name: 'unenv',
    setup(build) {
      handlePolyfills(build, polyfill)
      handleRequireCallsToNodeJSBuiltins(build)
      handleAliasedNodeJSPackages(build, alias, external)
      handleNodeJSGlobals(build, inject)
    }
  }
}

/**
 * Handle polyfills by injecting them into the bundle
 */
function handlePolyfills(build: PluginBuild, polyfill: string[]) {
  if (polyfill.length === 0) return
  build.initialOptions.inject = [...(build.initialOptions.inject ?? []), ...polyfill.map((id) => require_.resolve(id))]
}

/**
 * We must convert `require()` calls for Node.js to a virtual ES Module that can be imported avoiding the require calls.
 * We do this by creating a special virtual ES module that re-exports the library in an onLoad handler.
 * The onLoad handler is triggered by matching the "namespace" added to the resolve.
 */
function handleRequireCallsToNodeJSBuiltins(build: PluginBuild) {
  const NODEJS_MODULES_RE = new RegExp(`^(node:)?(${builtinModules.join('|')})$`)
  build.onResolve({ filter: NODEJS_MODULES_RE }, (args) => {
    if (args.kind === 'require-call') {
      return {
        path: args.path,
        namespace: REQUIRED_NODE_BUILT_IN_NAMESPACE
      }
    }
  })
  build.onLoad({ filter: /.*/, namespace: REQUIRED_NODE_BUILT_IN_NAMESPACE }, ({ path }) => {
    return {
      contents: [`import libDefault from '${path}';`, 'export default libDefault;'].join('\n'),
      loader: 'js'
    }
  })
}

function handleAliasedNodeJSPackages(build: PluginBuild, alias: Record<string, string>, external: string[]) {
  // esbuild expects alias paths to be absolute
  const aliasAbsolute = Object.fromEntries(
    Object.entries(alias)
      .map(([key, value]) => {
        let resolvedAliasPath
        try {
          resolvedAliasPath = require_.resolve(value)
        } catch (e) {
          // this is an alias for package that is not installed in the current app => ignore
          resolvedAliasPath = ''
        }

        return [key, resolvedAliasPath.replace(/\.cjs$/, '.mjs')]
      })
      .filter((entry) => entry[1] !== '')
  )
  const UNENV_ALIAS_RE = new RegExp(`^(${Object.keys(aliasAbsolute).join('|')})$`)

  build.onResolve({ filter: UNENV_ALIAS_RE }, (args) => {
    // Resolve the alias to its absolute path and potentially mark it as external
    return {
      path: aliasAbsolute[args.path],
      //@ts-ignore
      external: external.includes(alias[args.path])
    }
  })
}

/**
 * Inject node globals defined in unenv's `inject` config via virtual modules
 */
function handleNodeJSGlobals(build: PluginBuild, inject: Record<string, string | string[]>) {
  const UNENV_GLOBALS_RE = /_virtual_unenv_global_polyfill-([^.]+)\.js$/

  build.initialOptions.inject = [
    ...(build.initialOptions.inject ?? []),
    //convert unenv's inject keys to absolute specifiers of custom virtual modules that will be provided via a custom onLoad
    ...Object.keys(inject).map((globalName) =>
      nodePath.resolve(packagePath, `_virtual_unenv_global_polyfill-${encodeToLowerCase(globalName)}.js`)
    )
  ]

  build.onResolve({ filter: UNENV_GLOBALS_RE }, ({ path }) => ({ path }))

  build.onLoad({ filter: UNENV_GLOBALS_RE }, ({ path }) => {
    // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
    //@ts-ignore
    const globalName = decodeFromLowerCase(path.match(UNENV_GLOBALS_RE)![1])
    const globalMapping = inject[globalName]

    if (typeof globalMapping === 'string') {
      const possiblePaths = [globalMapping, `${globalMapping}/index`]
      const found = possiblePaths.find((path) => {
        try {
          const found = require_.resolve(path)
          if (found) {
            return true
          }
        } catch (error) {}
      })

      return {
        contents: `
          import globalVar from "${found}";

          ${
            /*
            // ESBuild's inject doesn't actually touch globalThis, so let's do it ourselves
            // by creating an exportable so that we can preserve the globalThis assignment if
            // the ${globalName} was found in the app, or tree-shake it, if it wasn't
            // see https://esbuild.github.io/api/#inject
            */ ''
          }
          const exportable =
            ${
              /*
              // mark this as a PURE call so it can be ignored and tree-shaken by ESBuild,
              // when we don't detect 'process', 'global.process', or 'globalThis.process'
              // in the app code
              // see https://esbuild.github.io/api/#tree-shaking-and-side-effects
              */ ''
            }
            /* @__PURE__ */ (() => {
              return globalThis.${globalName} = globalVar;
            })();

          export {
            exportable as '${globalName}',
            exportable as 'globalThis.${globalName}',
          }
        `
      }
    }
    //@ts-ignore
    const [moduleName, exportName] = inject[globalName]

    return {
      contents: `
        import { ${exportName} } from "${moduleName}";

        ${
          /*
          // ESBuild's inject doesn't actually touch globalThis, so let's do it ourselves
          // by creating an exportable so that we can preserve the globalThis assignment if
          // the ${globalName} was found in the app, or tree-shake it, if it wasn't
          // see https://esbuild.github.io/api/#inject
          */ ''
        }
        const exportable =
          ${
            /*
            // mark this as a PURE call so it can be ignored and tree-shaken by ESBuild,
            // when we don't detect 'process', 'global.process', or 'globalThis.process'
            // in the app code
            // see https://esbuild.github.io/api/#tree-shaking-and-side-effects
            */ ''
          }
          /* @__PURE__ */ (() => {
            return globalThis.${globalName} = ${exportName};
          })();

        export {
          exportable as '${globalName}',
          exportable as 'global.${globalName}',
          exportable as 'globalThis.${globalName}'
        }
      `
    }
  })
}

/**
 * Encodes a case sensitive string to lowercase string by prefixing all uppercase letters
 * with $ and turning them into lowercase letters.
 *
 * This function exists because ESBuild requires that all resolved paths are case insensitive.
 * Without this transformation, ESBuild will clobber /foo/bar.js with /foo/Bar.js
 *
 * This is important to support `inject` config for `performance` and `Performance` introduced
 * in https://github.com/unjs/unenv/pull/257
 */
export function encodeToLowerCase(str: string): string {
  return str.replaceAll(/\$/g, () => '$$').replaceAll(/[A-Z]/g, (letter) => `$${letter.toLowerCase()}`)
}

/**
 * Decodes a string lowercased using `encodeToLowerCase` to the original strings
 */
export function decodeFromLowerCase(str: string): string {
  let out = ''
  let i = 0
  while (i < str.length - 1) {
    if (str[i] === '$') {
      i++
      //@ts-ignore
      out += str[i].toUpperCase()
    } else {
      out += str[i]
    }
    i++
  }
  if (i < str.length) {
    out += str[i]
  }
  return out
}
