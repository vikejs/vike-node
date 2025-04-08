export { assert, assertUsage }

import pc from '@brillout/picocolors'

function assert(condition: unknown): asserts condition {
  if (condition) return
  throw new Error(
    `${red('[vike-server][Bug]')} You stumbled upon a vike-server bug. Reach out on GitHub and copy-paste this error — a maintainer will fix the bug.`
  )
}

function assertUsage(condition: unknown, message: string): asserts condition {
  if (condition) return
  throw new Error(`${red('[vike-server][Wrong Usage]')} ${message}`)
}

function red(str: string) {
  return pc.red(pc.bold(str))
}
