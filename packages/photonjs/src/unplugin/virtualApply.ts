import oxc from 'oxc-transform'
import type { UnpluginFactory, UnpluginOptions } from 'unplugin'
import { assert, assertUsage } from '../utils/assert.js'

const re = /^photonjs:virtual-apply:(?<condition>dev|edge|node):(?<server>[^:]+)(?<rest>.*)/
const re2 = /^photonjs:get-virtual-apply-middlewares:(?<condition>dev|edge|node):(?<server>[^:]+)(?<rest>.*)/
interface MatchGroups {
  condition: 'dev' | 'edge' | 'node'
  server: string
  rest: string
}

function test(id: string): MatchGroups | null {
  const match = id.match(re)
  if (!match) return null
  return match.groups as unknown as MatchGroups
}

function test2(id: string): MatchGroups | null {
  const match = id.match(re2)
  if (!match) return null
  return match.groups as unknown as MatchGroups
}

function compile(id: string) {
  const match = test(id)
  if (!match) throw new Error(`Invalid id ${id}`)

  //language=ts
  const code = `import { apply as applyAdapter } from '@universal-middleware/${match.server}';
import getUniversalMiddlewares from 'photonjs:get-virtual-apply-middlewares:${match.condition}:${match.server}${match.rest}';
import type { RuntimeAdapterTarget } from '@universal-middleware/core';
${match.condition === 'dev' ? 'import { devServerMiddleware } from "@photonjs/core/dev";' : ''}

export type Options = typeof getUniversalMiddlewares extends (...args: infer Opts) => any ? Opts : never;

export function apply(app: Parameters<typeof applyAdapter>[0], ...options: Options): Parameters<typeof applyAdapter>[0] {
  // FIXME proper deep merge
  let middlewares = getUniversalMiddlewares({ ...options, photonjs: { condition: ${JSON.stringify(match.condition)} } });
  if (!Array.isArray(middlewares)) {
    middlewares = [middlewares];
  }
  ${match.condition === 'dev' ? 'middlewares.unshift(devServerMiddleware());' : ''}
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

export interface Options {
  resolveId: NonNullable<UnpluginOptions['resolveId']>
}

// TODO add option to support emitting multiple files per condition/server combo
//  with ids like "photonjs:virtual-apply:dev:elysia:1"

// TODO option to opt-in to auto update of package.json file
export const virtualApplyFactory: UnpluginFactory<Options> = (options) => {
  const typings = new Map<string, string>()

  return {
    name: 'photonjs:virtual-apply',

    esbuild: {
      config(opts) {
        opts.entryPoints ??= {}
        if (Array.isArray(opts.entryPoints)) {
          // TODO copy from from universal-middleware
          throw new Error('TODO')
        }
        // dev
        opts.entryPoints['elysia.dev'] = 'photonjs:virtual-apply:dev:elysia'
        opts.entryPoints['express.dev'] = 'photonjs:virtual-apply:dev:express'
        opts.entryPoints['fastify.dev'] = 'photonjs:virtual-apply:dev:fastify'
        opts.entryPoints['h3.dev'] = 'photonjs:virtual-apply:dev:h3'
        opts.entryPoints['hattip.dev'] = 'photonjs:virtual-apply:dev:hattip'
        opts.entryPoints['hono.dev'] = 'photonjs:virtual-apply:dev:hono'
        // edge
        opts.entryPoints['elysia.edge'] = 'photonjs:virtual-apply:edge:elysia'
        opts.entryPoints['h3.edge'] = 'photonjs:virtual-apply:edge:h3'
        opts.entryPoints['hattip.edge'] = 'photonjs:virtual-apply:edge:hattip'
        opts.entryPoints['hono.edge'] = 'photonjs:virtual-apply:edge:hono'
        // node
        opts.entryPoints.elysia = 'photonjs:virtual-apply:node:elysia'
        opts.entryPoints.express = 'photonjs:virtual-apply:node:express'
        opts.entryPoints.fastify = 'photonjs:virtual-apply:node:fastify'
        opts.entryPoints.h3 = 'photonjs:virtual-apply:node:h3'
        opts.entryPoints.hattip = 'photonjs:virtual-apply:node:hattip'
        opts.entryPoints.hono = 'photonjs:virtual-apply:node:hono'
      }
    },

    async resolveId(id, importer, opts) {
      console.log('resolveId', id)
      if (test(id)) {
        return id
      }
      const match = test2(id)
      if (match) {
        const res = await options.resolveId.bind(this)(id, importer, opts)
        assertUsage(
          res,
          `[photonjs:build] Unknown id ${id}. Use { resolveId } option to map this ID to an actual module`
        )

        assert(importer)
        let dts = typings.get(importer)
        assert(dts)

        if (typeof res === 'string') {
          dts = dts.replaceAll(id, res)
        } else {
          dts = dts.replaceAll(id, res.id)
        }

        this.emitFile({
          type: 'asset',
          fileName: match.condition === 'node' ? `${match.server}.d.ts` : `${match.server}.${match.condition}.d.ts`,
          source: dts
        })

        return res
      }
    },

    loadInclude(id) {
      return Boolean(test(id))
    },

    load(id) {
      const match = test(id)
      if (!match) return

      const compiled = compile(id)

      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      typings.set(id, compiled.declaration!)

      return {
        code: compiled.code,
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        map: compiled.map!
      }
    }
  }
}
