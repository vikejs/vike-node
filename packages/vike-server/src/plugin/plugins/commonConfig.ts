import type { Plugin } from 'vite'

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
            externalConditions: ['node', 'development|production']
          },
          build: {
            target: 'es2022'
          }
        }
      }
    }
  ]
}
