import { getVikeConfig } from 'vike/plugin'
import type { ResolvedConfig, UserConfig } from 'vite'
import type { ConfigVikeServerResolved } from '../../types.js'
import { resolveServerConfig } from './resolveServerConfig.js'

export function getVikeServerConfig(config: UserConfig | ResolvedConfig): ConfigVikeServerResolved {
  const vikeConfig = getVikeConfig(config)
  return resolveServerConfig(vikeConfig.config.server)
}
