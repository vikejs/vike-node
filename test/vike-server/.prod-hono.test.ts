process.env.VIKE_NODE_FRAMEWORK = 'hono'

import { testRun } from './.testRun'
testRun('pnpm run prod')
