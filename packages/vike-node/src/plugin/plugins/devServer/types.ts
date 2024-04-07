export type { ClientFunctions, MinimalModuleNode, ServerFunctions, WorkerData }

import type { FetchResult, EnvironmentModuleNode, ResolvedUrl } from 'vite'

type WorkerData = {
  entry: string
  viteConfig: {
    root: string
    configVikePromise: any
  }
}

type ClientFunctions = {
  start(workerData: WorkerData): void
  deleteByModuleId(modulePath: string): boolean
  invalidateDepTree(ids: string[]): void
}

type MinimalModuleNode = Pick<EnvironmentModuleNode, 'id' | 'url' | 'type'> & {
  importedModules: Set<MinimalModuleNode>
}

type ServerFunctions = {
  fetchModule(id: string, importer?: string): Promise<FetchResult>
  moduleGraphResolveUrl(url: string): Promise<ResolvedUrl>
  moduleGraphGetModuleById(id: string): MinimalModuleNode | undefined
  transformIndexHtml(url: string, html: string, originalUrl?: string): Promise<string>
}
