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
         * HMR support for server files.
         * If true, rely on Vite HMR implementation.
         * If 'prefer-restart', restart the whole server process upon change.
         * If false, disables HMR.
         *
         * @experimental
         * @default true
         */
        hmr?: boolean | 'prefer-restart'

        /**
         * Specify dependencies to exclude from bundling.
         *
         * When provided, this array:
         * - Configures Vite's SSR externals (https://vitejs.dev/guide/ssr.html#ssr-externals)
         * - Sets esbuild externals when standalone mode is enabled
         * - In standalone builds, external dependencies are automatically copied to the
         *   output directory with their directory structure preserved
         *
         * Use this for:
         * - Dependencies with native/binary components that can't be bundled
         * - Large dependencies that rarely change
         * - Dependencies that must be dynamically loaded at runtime
         *
         * @example ['sharp', '@prisma/client', 'canvas']
         * @default []
         */
        external?: string[]
      }
}

interface ConfigVikeServerResolved {
  entry: { index: string; [name: string]: string }
  standalone: boolean | { esbuild: Omit<BuildOptions, 'manifest'> }
  hmr: boolean | 'prefer-restart'
  external: string[]
}
