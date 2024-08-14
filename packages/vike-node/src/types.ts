export type { ConfigVikeNode, ConfigVikeNodeResolved, ConfigVikeNodePlugin, Runtime, EntryResolved }

type Runtime = 'node' | 'nodeless' | 'deno' | 'cloudflare' | 'vercel'
type ConfigVikeNode = {
  /** Server entry path.
   *
   */
  server:
    | string
    | {
        entry: string | { index: string; [name: string]: string | { path: string; runtime: Runtime } }
        /** Enable standalone build.
         *
         * @default false
         */
        standalone?: boolean

        /** List of external/native dependencies.
         *
         */
        external?: string[]
      }
}

type EntryResolved = { index: { path: string; runtime: Runtime }; [name: string]: { path: string; runtime: Runtime } }
type ConfigVikeNodeResolved = {
  server: {
    entry: EntryResolved
    external: string[]
    standalone: boolean
  }
}

type ConfigVikeNodePlugin = ConfigVikeNode['server']
