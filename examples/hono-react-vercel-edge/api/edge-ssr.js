export const config = {
  runtime: 'edge'
}

// Import the built server entry from dist, so import.meta.env and other Vite features
// are available in server/app.js (Vite already processed this file)
import app from '../dist/server/app.mjs'

export const GET = app.fetch
export const POST = app.fetch
