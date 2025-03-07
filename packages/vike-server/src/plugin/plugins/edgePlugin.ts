export { checkEdge }

import type { Plugin } from 'vite'
import type { Runtime } from '@universal-middleware/core'
import type { ConfigVikeNodePlugin, ConfigVikeNodeResolved } from '../../types.js'
import { resolveConfig } from '../utils/resolveConfig.js'

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

function checkEdge(configVikeNodePlugin: ConfigVikeNodePlugin): Plugin[] {
  const resolvedConfig: ConfigVikeNodeResolved = resolveConfig({ server: configVikeNodePlugin })

  return [
    {
      name: 'vike-server:check-edge',

      configResolved(config) {
        for (const [runtime, edgeEnv] of Object.entries(edgePlugins)) {
          if (resolvedConfig.server.runtime === runtime) {
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
