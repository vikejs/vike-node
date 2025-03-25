import type { RuntimeAdapterTarget } from '@universal-middleware/core'

export type VikeOptions<T = unknown> = {
  pageContext?: // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    | ((req: RuntimeAdapterTarget<T>) => Record<string, any> | Promise<Record<string, any>>)
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    | Record<string, any>
  compress?: boolean | 'static'
  static?: boolean | string | { root?: string; cache?: boolean }
  onError?: (err: unknown) => void
}
