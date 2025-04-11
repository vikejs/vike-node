import type { Plugin } from 'vite'

export type GetPhotonCondition = (condition: 'dev' | 'edge' | 'node', server: string) => string

export interface DefinePhotonLibOptions {
  resolveMiddlewares?: GetPhotonCondition
}

export function definePhotonLib(name: string, options?: DefinePhotonLibOptions): Plugin[] {
  return [
    {
      name: `photonjs:resolve-virtual-importer:${name}`,
      enforce: 'post',

      async resolveId(id, importer, opts) {
        if (importer === 'photonjs:fallback-entry' || importer?.startsWith('photonjs:get-middlewares:')) {
          const resolved = await this.resolve(id, importer, opts)

          if (!resolved) {
            const resolvedPkg = await this.resolve(name)
            // Multiple libs can try to resolve this
            if (resolvedPkg) {
              return this.resolve(id, resolvedPkg.id, opts)
            }
          }
        }
      }
    },
    {
      name: `photonjs:define-middlewares:${name}`,
      config() {
        if (options?.resolveMiddlewares) {
          return {
            photonjs: {
              middlewares: [options.resolveMiddlewares]
            }
          }
        }
      }
    }
  ]
}
