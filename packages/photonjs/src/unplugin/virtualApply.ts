import oxc from 'oxc-transform'
import type { UnpluginFactory } from 'unplugin'
import { assert } from '../utils/assert.js'

const re_apply = /^photonjs:virtual-apply:(?<condition>dev|edge|node):(?<server>[^:]+)(?<rest>.*)/
const re_index = /^photonjs:virtual-index:(?<server>[^:]+)(?<rest>.*)/
interface MatchGroups {
  condition?: 'dev' | 'edge' | 'node'
  server: string
  rest: string
}

function test(id: string, re: RegExp): MatchGroups | null {
  const match = id.match(re)
  if (!match) return null
  return match.groups as unknown as MatchGroups
}

function compileApply(id: string) {
  const match = test(id, re_apply)
  if (!match) throw new Error(`Invalid id ${id}`)

  //language=ts
  const code = `import { apply as applyAdapter } from '@universal-middleware/${match.server}';
import getUniversalMiddlewares from 'photonjs:get-middlewares:${match.condition}:${match.server}${match.rest}';
import { type RuntimeAdapterTarget, type UniversalMiddleware, getUniversalProp, nameSymbol } from '@universal-middleware/core';
${match.condition === 'dev' ? 'import { devServerMiddleware } from "@photonjs/core/dev";' : ''}

function isValidUniversalMiddleware(middleware: unknown): asserts middleware is UniversalMiddleware {
  if (!getUniversalProp(middleware, nameSymbol)) {
    throw new TypeError("[photonjs] All middlewares require a name. Use enhance helper as described in the documentation: https://universal-middleware.dev/helpers/enhance");
  }
}

export function apply(app: Parameters<typeof applyAdapter>[0], additionalMiddlewares?: UniversalMiddleware[]): Parameters<typeof applyAdapter>[0] {
  const middlewares = getUniversalMiddlewares();
  ${match.condition === 'dev' ? 'middlewares.unshift(devServerMiddleware());' : ''}

  // sanity check
  middlewares.forEach(isValidUniversalMiddleware);
  
  // dedupe
  if (additionalMiddlewares) {
    for (const middleware of additionalMiddlewares) {
      isValidUniversalMiddleware(middleware);
      const i = middlewares.findIndex(m => getUniversalProp(m, nameSymbol) === getUniversalProp(middleware, nameSymbol));
      if (i !== -1) {
        middlewares.splice(i, 1);
      }
      middlewares.push(middleware);
    }
  }
  
  applyAdapter(app, middlewares);

  return app;
}

export type RuntimeAdapter = RuntimeAdapterTarget<${JSON.stringify(match.server)}>;
`
  const result = oxc.transform(`${match.server}.${match.condition}.ts`, code, {
    sourcemap: true,
    typescript: {
      declaration: {}
    }
  })

  return {
    ...match,
    ...result
  }
}

function compileIndex(id: string) {
  const match = test(id, re_index)
  if (!match) throw new Error(`Invalid id ${id}`)

  //language=ts
  const code = `export { apply, type RuntimeAdapter } from '@photonjs/core/${match.server}/apply'
export { serve } from '@photonjs/core/${match.server}/serve'
`
  const result = oxc.transform(`${match.server}.ts`, code, {
    sourcemap: true,
    typescript: {
      declaration: {}
    }
  })

  return {
    ...match,
    ...result
  }
}

const entries = {
  // -- apply
  // dev
  'elysia/apply.dev': 'photonjs:virtual-apply:dev:elysia',
  'express/apply.dev': 'photonjs:virtual-apply:dev:express',
  'fastify/apply.dev': 'photonjs:virtual-apply:dev:fastify',
  'h3/apply.dev': 'photonjs:virtual-apply:dev:h3',
  'hattip/apply.dev': 'photonjs:virtual-apply:dev:hattip',
  'hono/apply.dev': 'photonjs:virtual-apply:dev:hono',
  // edge
  'elysia/apply.edge': 'photonjs:virtual-apply:edge:elysia',
  'h3/apply.edge': 'photonjs:virtual-apply:edge:h3',
  'hattip/apply.edge': 'photonjs:virtual-apply:edge:hattip',
  'hono/apply.edge': 'photonjs:virtual-apply:edge:hono',
  // node
  'elysia/apply': 'photonjs:virtual-apply:node:elysia',
  'express/apply': 'photonjs:virtual-apply:node:express',
  'fastify/apply': 'photonjs:virtual-apply:node:fastify',
  'h3/apply': 'photonjs:virtual-apply:node:h3',
  'hattip/apply': 'photonjs:virtual-apply:node:hattip',
  'hono/apply': 'photonjs:virtual-apply:node:hono',
  // -- index,
  elysia: 'photonjs:virtual-index:elysia',
  express: 'photonjs:virtual-index:express',
  fastify: 'photonjs:virtual-index:fastify',
  h3: 'photonjs:virtual-index:h3',
  hattip: 'photonjs:virtual-index:hattip',
  hono: 'photonjs:virtual-index:hono'
}

export const virtualApplyFactory: UnpluginFactory<undefined> = () => {
  return {
    name: 'photonjs:virtual-apply',

    esbuild: {
      config(opts) {
        opts.entryPoints ??= {}
        assert(!Array.isArray(opts.entryPoints))
        Object.assign(opts.entryPoints, entries)

        opts.external ??= []
        opts.external.push('@photonjs/core/elysia/apply')
        opts.external.push('@photonjs/core/elysia/serve')
        opts.external.push('@photonjs/core/express/apply')
        opts.external.push('@photonjs/core/express/serve')
        opts.external.push('@photonjs/core/fastify/apply')
        opts.external.push('@photonjs/core/fastify/serve')
        opts.external.push('@photonjs/core/h3/apply')
        opts.external.push('@photonjs/core/h3/serve')
        opts.external.push('@photonjs/core/hattip/apply')
        opts.external.push('@photonjs/core/hattip/serve')
        opts.external.push('@photonjs/core/hono/apply')
        opts.external.push('@photonjs/core/hono/serve')
      }
    },

    async resolveId(id) {
      if (test(id, re_apply) || test(id, re_index)) {
        return id
      }
    },

    loadInclude(id) {
      return Boolean(test(id, re_apply) || test(id, re_index))
    },

    load(id) {
      {
        const match = test(id, re_apply)
        if (match) {
          const compiled = compileApply(id)
          const fileName = Object.entries(entries).find(([, v]) => v === id)?.[0]
          assert(fileName)

          this.emitFile({
            type: 'asset',
            fileName: `${fileName}.d.ts`,
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            source: compiled.declaration!
          })

          return {
            code: compiled.code,
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            map: compiled.map!
          }
        }
      }
      {
        const match = test(id, re_index)
        if (match) {
          const compiled = compileIndex(id)
          const fileName = Object.entries(entries).find(([, v]) => v === id)?.[0]
          assert(fileName)

          this.emitFile({
            type: 'asset',
            fileName: `${fileName}.d.ts`,
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            source: compiled.declaration!
          })

          return {
            code: compiled.code,
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            map: compiled.map!
          }
        }
      }
    }
  }
}
