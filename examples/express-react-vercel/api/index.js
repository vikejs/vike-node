import { connectToWeb } from 'vike-node'
import app from '../server/index.js'

// Web request handlers support streaming by default on Vercel
export const GET = connectToWeb(app)
