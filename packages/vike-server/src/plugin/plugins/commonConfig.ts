import type { Plugin } from 'vite'
import { isBun } from '../utils/isBun.js'
import { isDeno } from '../utils/isDeno.js'

export { commonConfig }

function commonConfig(): Plugin[] {
  return [
    {
      enforce: 'pre',
      name: 'vike-server:commonConfig',

      applyToEnvironment(env) {
        return env.name === 'ssr'
      },

      configEnvironment() {
        return {
          resolve: {
            noExternal: 'vike-server',
            externalConditions: [...(isBun ? ['bun'] : isDeno ? ['deno'] : []), 'node', 'development|production']
          },
          build: {
            target: 'es2022'
          }
        }
      }
    }
  ]
}
