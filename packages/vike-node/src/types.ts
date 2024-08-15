export type { ConfigVikeNode, ConfigVikeNodeResolved, ConfigVikeNodePlugin, Runtime, EntryResolved }

type Runtime = 'node' | 'nodeless' | 'deno' | 'cloudflare' | 'cloudflare-nodejs-compat' | 'vercel'
type ConfigVikeNode = {
  /** Server entry path.
   *
   */
  server:
    | string
    | {
        entry:
          | string
          | { index: string; [name: string]: string | { entry: string; runtime: Runtime; scaffold?: string } }
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

type EntryResolved = {
  index: { entry: string; runtime: Runtime }
  [name: string]: { entry: string; runtime: Runtime; scaffold?: string }
}
type ConfigVikeNodeResolved = {
  server: {
    entry: EntryResolved
    external: string[]
    standalone: boolean
  }
}

type ConfigVikeNodePlugin = ConfigVikeNode['server']
