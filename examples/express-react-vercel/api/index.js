// Import the built server entry from dist, so import.meta.env and other Vite features
// are available in the server entry (Vite already processed this file)
import app from '../dist/server/index.mjs'

// Web request handlers support streaming by default on Vercel
import { connectToWeb } from 'vike-server'

const handler = connectToWeb(app)
export const GET = handler
export const POST = handler
