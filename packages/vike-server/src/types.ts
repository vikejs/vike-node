import type { BuildOptions } from 'esbuild'

export type ConfigVikeServer = {
  /**
   * Server entry path.
   */
  server:
    | string
    | {
        entry: string | PhotonEntry | { index: string | PhotonEntry; [name: string]: string | PhotonEntry }
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
      }
}

export interface ConfigVikeServerResolved {
  entry: { index: PhotonEntry; [name: string]: PhotonEntry }
  standalone: boolean | { esbuild: Omit<BuildOptions, 'manifest'> }
  hmr: boolean | 'prefer-restart'
}

export interface PhotonEntry {
  id: string
  type?: 'auto' | 'server' | 'universal-handler'
}

export interface PhotonEntryResolved {
  id: string
  type: 'server' | 'universal-handler'
}
