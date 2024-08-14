export const config = {
  runtime: 'edge'
}

import app from '../dist/server/app.mjs'
export const GET = app.fetch
export const POST = app.fetch
