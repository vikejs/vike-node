export type { ConfigVikeServer, ConfigVikeServerResolved }

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

        /**
         * HMR support for server files.
         * If true, rely on Vite HMR implementation.
         * If 'prefer-restart', restart the whole server process upon change.
         * If false, disables HMR.
         *
         * @experimental
         * @default true
         */
        hmr?: boolean | 'prefer-restart'
      }
}

interface ConfigVikeServerResolved {
  entry: { index: string; [name: string]: string }
  external: string[]
  standalone: boolean | { esbuild: Omit<BuildOptions, 'manifest'> }
  hmr: boolean | 'prefer-restart'
}
