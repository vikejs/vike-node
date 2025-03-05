export type { ConfigVikeNode, ConfigVikeNodeResolved, ConfigVikeNodePlugin, Runtime, EntryResolved }

import type { BuildOptions } from 'esbuild'

type Runtime = 'node' | 'nodeless' | 'deno' | 'cloudflare' | 'cloudflare-nodejs-compat' | 'vercel'
type DetailedEntry = { entry: string; runtime: Runtime }
type ConfigVikeNode = {
  /** Server entry path.
   *
   */
  server:
    | string
    | {
        entry: string | { index: string; [name: string]: string | DetailedEntry }
        /** Enable standalone build.
         *
         * @default false
         */
        standalone?: boolean | { esbuild: Omit<BuildOptions, 'manifest'> }

        /** List of external/native dependencies.
         *
         */
        external?: string[]
      }
}

type EntryResolved = {
  index: DetailedEntry
  [name: string]: DetailedEntry
}
type ConfigVikeNodeResolved = {
  server: {
    entry: EntryResolved
    external: string[]
    standalone: boolean | { esbuild: Omit<BuildOptions, 'manifest'> }
  }
}

type ConfigVikeNodePlugin = ConfigVikeNode['server']
