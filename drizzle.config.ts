import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Load from .env.local (Next.js convention)
config({ path: '.env.local' })

// db:push (dev) → local SQLite file
// db:push:prod  → Turso production via env vars
const isProd = process.env.DRIZZLE_ENV === 'production'

const url = isProd
  ? process.env.TURSO_DATABASE_URL
  : 'file:data/local.db'

const authToken = isProd
  ? process.env.TURSO_AUTH_TOKEN
  : undefined

if (isProd && (!url || !authToken)) {
  throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN for production push')
}

console.log(`[Drizzle] Pushing to ${isProd ? 'PRODUCTION' : 'local'} database`)

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: url!,
    authToken,
  },
})
