export { vikeNode as default, vikeNode }

import { setPluginLoaded } from '../runtime/env.js'
import type { ConfigVikeNodeResolved } from '../types.js'
import { commonConfig } from './plugins/commonConfig.js'
import { devServerPlugin } from './plugins/devServer/devServerPlugin.js'
import { serverEntryPlugin } from './plugins/serverEntryPlugin.js'
import { standalonePlugin } from './plugins/standalonePlugin.js'
import { resolveConfig } from './utils/resolveConfig.js'
import { Config } from 'vike/types'

setPluginLoaded()

function vikeNode() {
  const { server } = getVikeConfig() as Config
  const resolvedConfig: ConfigVikeNodeResolved = resolveConfig({ server })

  return [
    commonConfig(resolvedConfig),
    serverEntryPlugin(resolvedConfig),
    devServerPlugin(resolvedConfig),
    resolvedConfig.server.standalone && standalonePlugin(resolvedConfig)
  ]
}
