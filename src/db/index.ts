import { drizzle } from 'drizzle-orm/libsql'
import { createClient, type Client } from '@libsql/client'
import * as schema from './schema'

let _client: Client | undefined
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined

function getDb() {
  if (_db) return _db
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set')
  }
  _client = createClient({ url, authToken })
  _db = drizzle(_client, { schema })
  return _db
}

// Proxy so existing `import { db } from '@/db'` callers keep working without
// constructing the libsql client at module-load time (which breaks Next.js
// build-time page-data collection when env vars are absent).
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  },
})

// Re-export schema for convenience
export * from './schema'
