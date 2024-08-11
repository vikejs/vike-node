export async function isNodeLike() {
  try {
    await import('node:http')
    return true
  } catch {
    return false
  }
}
