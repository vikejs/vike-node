export type { ConfigVikeServer, ConfigVikeServerResolved, ConfigVikeServerPlugin }

import type { Runtime } from '@universal-middleware/core'
import type { BuildOptions } from 'esbuild'

type ConfigVikeServer = {
  /**
   * Server entry path.
   */
  server:
    | string
    | {
        entry: string | { index: string; [name: string]: string }
        /**
         * Under which runtime will your built code run
         * @default "node"
         */
        runtime?: Runtime['runtime']
        /**
         * This is an experimental feature. If an error occurs during build, please disable standalone mode and try again.
         *
         * Enable standalone build.
         *
         * @experimental
         * @default false
         */
        standalone?: boolean | { esbuild: Omit<BuildOptions, 'manifest'> }

        /**
         * List of external/native dependencies.
         */
        external?: string[]
      }
}

interface ConfigVikeServerResolved {
  entry: { index: string; [name: string]: string }
  runtime: Runtime['runtime']
  external: string[]
  standalone: boolean | { esbuild: Omit<BuildOptions, 'manifest'> }
}

type ConfigVikeServerPlugin = ConfigVikeServer['server']
