export { logViteInfo, logViteWarn }

import pc from '@brillout/picocolors'

function logViteInfo(message: string) {
  console.log(`${pc.bold(pc.cyan('[vite]'))} ${message}`)
}

function logViteWarn(message: string) {
  console.warn(`${pc.bold(pc.yellow('[vite]'))} ${message}`)
}
