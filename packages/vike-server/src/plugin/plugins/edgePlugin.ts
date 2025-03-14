import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'
import type { Plugin } from 'vite'
import type { Runtime } from '@universal-middleware/core'

export { checkEdge }

type EdgePlugins = Partial<Record<Runtime['runtime'], { pluginName: string; label: string; link: string }>>

const edgePlugins = {
  workerd: {
    pluginName: 'vike-cloudflare',
    label: 'Cloudflare',
    link: 'https://vike.dev/cloudflare-pages'
  },
  'edge-light': {
    pluginName: 'vike-vercel',
    label: 'Vercel',
    link: 'https://vike.dev/vercel'
  }
} satisfies EdgePlugins

function checkEdge(): Plugin[] {
  return [
    {
      name: 'vike-server:check-edge',

      configResolved(config) {
        const vikeServerConfig = getVikeServerConfig(config)

        for (const [runtime, edgeEnv] of Object.entries(edgePlugins)) {
          if (vikeServerConfig.runtime === runtime) {
            const plugin = config.plugins.find(
              (p) => p.name === edgeEnv.pluginName || p.name.startsWith(`${edgeEnv.pluginName}:`)
            )

            if (!plugin) {
              throw new Error(
                `[vike-server] Please replace \`vike-server\` by \`${edgeEnv.pluginName}\` to be able to deploy to ${edgeEnv.label}. Check ${edgeEnv.link} for more information.`
              )
            }
          }
        }
      }
    }
  ]
}
