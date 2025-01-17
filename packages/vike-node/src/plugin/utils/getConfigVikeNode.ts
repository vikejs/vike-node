export { getConfigVikeNode }

import { ResolvedConfig, UserConfig } from 'vite'
import type { ConfigVikeNodeResolved } from '../../types.js'
import { assert } from '../../utils/assert.js'

function getConfigVikeNode(config: ResolvedConfig | UserConfig): ConfigVikeNodeResolved {
  const { configVikeNode } = config as any
  assert(configVikeNode)
  return configVikeNode
}
