import { getVikeConfig } from 'vike/plugin'
import type { ResolvedConfig, UserConfig } from 'vite'
import type { ConfigVikeServerPlugin, ConfigVikeServerResolved } from '../../types.js'
import { resolveServerConfig, resolveServerConfigs } from './resolveServerConfig.js'

export function getVikeServerConfig(config: UserConfig | ResolvedConfig): ConfigVikeServerResolved {
  const vikeConfig = getVikeConfig(config)
  if (Array.isArray(vikeConfig.config.server)) {
    return resolveServerConfigs(vikeConfig.config.server as ConfigVikeServerPlugin[])[1]
  }
  return resolveServerConfig(vikeConfig.config.server)
}

export function getVikeServerConfigs(
  config: UserConfig | ResolvedConfig
): [ConfigVikeServerResolved, ConfigVikeServerResolved] {
  const vikeConfig = getVikeConfig(config)
  return resolveServerConfigs(vikeConfig.config.server as unknown as ConfigVikeServerPlugin[])
}
