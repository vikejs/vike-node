import type { PluginContext } from 'rollup'
import type { Plugin } from 'vite'

// TODO remove rest param?
const re_getMiddlewares = /^photonjs:get-middlewares:(?<condition>dev|edge|node):(?<server>[^:]+)(?<rest>.*)/
interface MatchGroups {
  condition: 'dev' | 'edge' | 'node'
  server: string
  rest: string
}

function testGetMiddlewares(id: string): MatchGroups | null {
  const match = id.match(re_getMiddlewares)
  if (!match) return null
  return match.groups as unknown as MatchGroups
}

function getAllPhotonMiddlewares(pluginContext: PluginContext, id: string) {
  const match = testGetMiddlewares(id)
  if (!match) throw new Error(`Invalid id ${id}`)

  const getMiddlewares = pluginContext.environment.config.photonjs.middlewares ?? []
  const middlewares = getMiddlewares.map((m) => m(match.condition, match.server))

  // TODO handle libs returning UniversalMiddleware, UniversalMiddleware[], and (options?) => UniversalMiddleware | UniversalMiddleware[]
  //language=ts
  return `
${middlewares.map((m, i) => `import m${i} from ${JSON.stringify(m)};`).join('\n')}

const universalSymbol = Symbol.for("universal");
const unNameSymbol = Symbol.for("unName");

export default function getUniversalMiddlewares() {
  return [${middlewares.map((_, i) => `m${i}`).join(', ')}]
    .flat(Number.POSITIVE_INFINITY)
    .map(m => {
      if (typeof m === 'function') {
        if (universalSymbol in m) {
          return m[universalSymbol];
        }
        if (unNameSymbol in m) {
          return m;
        }
        // Assume it's a UniversalMidleware getter
        let r;
        try {
          r = m();
        } catch (e) {
          throw new Error("PhotonError: Ensure that all photon middlewares are wrapped with enhance helper. See https://universal-middleware.dev/helpers/enhance", { cause: e })
        }
        if (r instanceof Promise) {
          r.catch(e => {
            throw new Error("PhotonError: Ensure that all photon middlewares are wrapped with enhance helper. See https://universal-middleware.dev/helpers/enhance", { cause: e })
          });
          throw new Error("PhotonError: Ensure that all photon middlewares are wrapped with enhance helper. See https://universal-middleware.dev/helpers/enhance");
        }
        return r;
      }
    })
    .flat(Number.POSITIVE_INFINITY);
}
`
}

export function getMiddlewaresPlugin(): Plugin[] {
  return [
    {
      name: 'photonjs:get-middlewares',

      async resolveId(id) {
        const match = testGetMiddlewares(id)
        if (match) {
          return id
        }
      },

      load(id) {
        const match = testGetMiddlewares(id)
        if (match) {
          return getAllPhotonMiddlewares(this, id)
        }
      }
    }
  ]
}

export type GetPhotonCondition = (condition: 'dev' | 'edge' | 'node', server: string) => string

// TODO move as part of the API
export function defineEntries(name: string, fn: GetPhotonCondition): Plugin {
  return {
    name: `photonjs:define-entries:${name}`,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    config(userConfig: any) {
      userConfig.photonjs ??= {}
      userConfig.photonjs.middlewares ??= []
      userConfig.photonjs.middlewares.push(fn)
    }
  }
}
