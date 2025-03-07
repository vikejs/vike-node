import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RuntimeAdapterTarget } from '@universal-middleware/core'

export type HeadersProvided = Record<string, string | string[] | undefined> | Headers
export type VikeHttpResponse = Awaited<ReturnType<typeof import('vike/server').renderPage>>['httpResponse']
export type NextFunction = (err?: unknown) => void

export type VikeOptions<T = unknown> = {
  pageContext?: // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    | ((req: RuntimeAdapterTarget<T>) => Record<string, any> | Promise<Record<string, any>>)
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    | Record<string, any>
  compress?: boolean | 'static'
  static?: boolean | string | { root?: string; cache?: boolean }
  onError?: (err: unknown) => void
}

export type ConnectMiddleware<
  PlatformRequest extends IncomingMessage = IncomingMessage,
  PlatformResponse extends ServerResponse = ServerResponse
> = (req: PlatformRequest, res: PlatformResponse, next: NextFunction) => void | Promise<void>
export type ConnectMiddlewareBoolean<
  PlatformRequest extends IncomingMessage = IncomingMessage,
  PlatformResponse extends ServerResponse = ServerResponse
> = (req: PlatformRequest, res: PlatformResponse, next: NextFunction) => boolean | Promise<boolean>
export type WebHandler = (request: Request) => Response | undefined | Promise<Response | undefined>
