import type { Plugin } from 'vite'
import { isBun } from '../utils/isBun.js'
import { isDeno } from '../utils/isDeno.js'

export { commonConfig }

function commonConfig(): Plugin[] {
  return [
    {
      name: 'vike-server:commonConfig',

      configEnvironment(name, config) {
        if (!config.consumer) {
          config.consumer = name === 'client' ? 'client' : 'server'
        }
        return {
          resolve: {
            dedupe: ['vike-server'],
            noExternal: 'vike-server',
            externalConditions:
              config.consumer === 'server'
                ? [...(isBun ? ['bun'] : isDeno ? ['deno'] : []), 'node', 'development|production']
                : []
          },
          build: {
            target: 'es2022'
          }
        }
      }
    }
  ]
}
