export { assert, assertUsage }

function assert(condition: unknown, message?: string): asserts condition {
  if (condition) return
  if (message) {
    console.error(message)
  }
  throw new Error("You stumbled upon a bug in vike-server's source code. Reach out on GitHub and we will fix the bug.")
}

function assertUsage(condition: unknown, message: string): asserts condition {
  if (condition) return
  throw new Error(`[vike-server][Wrong Usage] ${message}`)
}
