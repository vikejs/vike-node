export { renderPage, renderPageWeb }

import { renderPage as _renderPage } from 'vike/server'
import type { VikeHttpResponse, VikeOptions } from './types.js'
import { isVercel } from '../utils/isVercel.js'
import { DUMMY_BASE_URL } from './constants.js'

async function renderPage<PlatformRequest>({
  url,
  headers,
  options,
  platformRequest
}: {
  url: string
  headers: [string, string][]
  options: VikeOptions<PlatformRequest>
  platformRequest: PlatformRequest
}): Promise<VikeHttpResponse> {
  function getPageContext(platformRequest: PlatformRequest): Record<string, any> {
    return typeof options.pageContext === 'function' ? options.pageContext(platformRequest) : options.pageContext ?? {}
  }

  const fixedUrl = isVercel()
    ? fixUrlVercel({
        url,
        headers
      })
    : url

  const pageContext = await _renderPage({
    urlOriginal: fixedUrl,
    headersOriginal: headers,
    ...(await getPageContext(platformRequest))
  })

  if (pageContext.errorWhileRendering) {
    options.onError?.(pageContext.errorWhileRendering)
  }

  if (!pageContext.httpResponse) {
    return null
  }

  return pageContext.httpResponse
}

async function renderPageWeb<PlatformRequest>({
  url,
  headers,
  platformRequest,
  options
}: {
  url: string
  headers: [string, string][]
  platformRequest: PlatformRequest
  options: VikeOptions<PlatformRequest>
}) {
  const httpResponse = await renderPage({
    url,
    headers,
    platformRequest,
    options
  })
  if (!httpResponse) return undefined
  const { statusCode, headers: headersOut, getReadableWebStream } = httpResponse
  return new Response(getReadableWebStream(), { status: statusCode, headers: headersOut })
}

function fixUrlVercel(request: { url: string; headers: [string, string][] }) {
  const parsedUrl = new URL(request.url, DUMMY_BASE_URL)
  const headers = request.headers
  const search = parsedUrl.searchParams
  const __original_path = search.get('__original_path')
  if (typeof __original_path === 'string') {
    search.delete('__original_path')
    return __original_path + parsedUrl.search
  }

  // FIXME: x-now-route-matches is not definitive https://github.com/orgs/vercel/discussions/577#discussioncomment-2769478
  const matchesHeader = headers.find((h) => h[0] === 'x-now-route-matches')?.[1]
  const matches = matchesHeader ? new URLSearchParams(matchesHeader).get('1') : null

  if (typeof matches === 'string') {
    const pathnameAndQuery = matches + (parsedUrl.search || '')
    return pathnameAndQuery
  }

  const pathnameAndQuery = (parsedUrl.pathname || '') + (parsedUrl.search || '')
  return pathnameAndQuery
}
