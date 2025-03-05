process.env.VIKE_NODE_FRAMEWORK = 'fastify'

import { testRun } from './.testRun'
testRun('pnpm run prod')
