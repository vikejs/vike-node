process.env.VIKE_NODE_FRAMEWORK = 'elysia'

import { testRun } from './.testRun'

testRun('pnpm run prod', { noServerHook: true })
