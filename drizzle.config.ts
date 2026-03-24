import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Load from .env.local (Next.js convention)
config({ path: '.env.local' })

// Check if we're pushing to production (via npm run db:push:prod)
const isProd = process.env.DRIZZLE_ENV === 'production'

// Use production credentials if available and DRIZZLE_ENV=production
const url = isProd
  ? process.env.TURSO_PROD_DATABASE_URL || process.env.TURSO_DATABASE_URL
  : process.env.TURSO_DATABASE_URL

const authToken = isProd
  ? process.env.TURSO_PROD_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN
  : process.env.TURSO_AUTH_TOKEN

if (!url || !authToken) {
  throw new Error(
    isProd
      ? 'Missing TURSO_PROD_DATABASE_URL or TURSO_PROD_AUTH_TOKEN for production push'
      : 'Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN'
  )
}

console.log(`[Drizzle] Pushing to ${isProd ? 'PRODUCTION' : 'development'} database`)

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url,
    authToken,
  },
})
