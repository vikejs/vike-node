import type { serve as honoServe } from '@hono/node-server'
import type { ServerOptions } from '../utils.js'

export type HonoServerOptions = Parameters<typeof honoServe>[0]
export type MergedHonoServerOptions = ServerOptions & Omit<HonoServerOptions, 'fetch' | 'port'>
