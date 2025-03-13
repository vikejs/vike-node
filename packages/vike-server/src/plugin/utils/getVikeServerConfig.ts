import { getVikeConfig } from 'vike/plugin'
import type { ResolvedConfig, UserConfig } from 'vite'
import type { ConfigVikeNodeResolved } from '../../types.js'

export function getVikeServerConfig(config: UserConfig | ResolvedConfig): ConfigVikeNodeResolved['server'] {
  const vikeConfig = getVikeConfig(config)

  return vikeConfig.config.server as ConfigVikeNodeResolved['server']
}
