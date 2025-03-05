process.env.VIKE_NODE_FRAMEWORK = 'express'

import { testRun } from './.testRun'
testRun('pnpm run prod')
