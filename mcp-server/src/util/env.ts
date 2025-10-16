import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// Load env from api/.env (shared with API) if present
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../../..')
dotenv.config({ path: path.join(rootDir, 'api/.env') })

export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env var: ${name}`)
  }
  return v
}

export function optionalEnv(name: string, fallback?: string): string | undefined {
  const v = process.env[name]
  return v && v.trim() !== '' ? v : fallback
}


