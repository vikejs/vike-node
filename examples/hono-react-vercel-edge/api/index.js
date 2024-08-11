export const edge = true

// Import the built server entry from dist, so import.meta.env and other Vite features
// are available in the server entry (Vite already processed this file)
import fetch from '../dist/server/index.mjs'

export const GET = fetch
export const POST = fetch
