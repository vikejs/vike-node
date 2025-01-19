import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

import { toPosixPath } from '../utils/filesystemPathHandling.js'

export const vikeHandlerPlugin = (): Plugin => {
  let isSSR: boolean
  let outDirAbs: string
  return {
    name: 'vike-node:vike-handler:post',
    apply: 'build',
    enforce: 'post',
    configResolved: (config) => {
      isSSR = !!config.build.ssr
      if (isSSR) {
        const root = toPosixPath(config.root)
        const outDir = toPosixPath(config.build.outDir)
        outDirAbs = path.isAbsolute(outDir) ? outDir : path.posix.join(root, outDir)
      }
    },
    closeBundle: async () => {
      if (!isSSR) return

      const serverIndexPath = `${outDirAbs}/index.mjs`
      const serverIndexCode = fs.readFileSync(serverIndexPath, 'utf-8')

      const match = /import\s+(?:[\w*\s{},]*)\s+from\s+'vike-node\/(.+?)';?/g.exec(serverIndexCode)
      const server = match ? match[1] : null

      if (!server) return

      const distServerVikeHandlerPath = `${outDirAbs}/vike-handler`

      if (!fs.existsSync(distServerVikeHandlerPath)) {
        fs.mkdirSync(distServerVikeHandlerPath)
      }

      const vikeNodeDist = require.resolve('vike-node').replaceAll('\\', '/').replace(/\/index.js$/, '')
      const vikeHandlerFilename = `universal-${server}-handler-vike.handler.js`

      // Copy the Vike handler to the 'dist/server' directory
      const vikeHandlerSource = `${vikeNodeDist}/${vikeHandlerFilename}`
      const vikeHandlerDestination = `${distServerVikeHandlerPath}/${vikeHandlerFilename}`
      fs.copyFileSync(vikeHandlerSource, vikeHandlerDestination)

      // Get the chunks from the Vike handler
      const vikeHandlerFilenameCode = fs.readFileSync(vikeHandlerSource, 'utf-8')
      const chunks = [...vikeHandlerFilenameCode.matchAll(/chunk-[A-Z0-9]+\.js/g)].map(match => match[0])
      // Copy the chunks to the 'dist/server' directory
      for (const chunk of chunks) {
        fs.copyFileSync(`${vikeNodeDist}/${chunk}`, `${distServerVikeHandlerPath}/${chunk}`)
      }

      // 'resolve-static-config' file is used by a chunk
      // Copy the 'resolve-static-config' file to the 'dist/server/vike-handler' directory
      const vikeNodeDistFiles = fs.readdirSync(vikeNodeDist)
      const vikeNodeDistFilename = vikeNodeDistFiles.find(file => file.startsWith('resolve-static-config-'))
      fs.copyFileSync(`${vikeNodeDist}/${vikeNodeDistFilename}`, `${distServerVikeHandlerPath}/${vikeNodeDistFilename}`)

      // Update the import statement to point to the new Vike handler in 'dist/server/vike-handler'
      const updatedContent = serverIndexCode.replace(/'vike-node\/\w+'/, `'./vike-handler/${vikeHandlerFilename}'`)
      fs.writeFileSync(serverIndexPath, updatedContent, 'utf-8')
    }
  }
}
