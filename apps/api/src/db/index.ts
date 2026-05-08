import 'server-only'
import { resolve } from 'path'
import { drizzle } from 'drizzle-orm/libsql'
import type { Client } from '@libsql/client'
import * as schema from '@kasero/shared/db/schema'

let _client: Client | undefined
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined

const isDev = process.env.NODE_ENV !== 'production'

function getDb() {
  if (_db) return _db
  const url = isDev
    ? `file:${resolve(process.cwd(), 'data/local.db')}`
    : process.env.TURSO_DATABASE_URL
  const authToken = isDev ? undefined : process.env.TURSO_AUTH_TOKEN
  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set')
  }
  // Conditional require so Next.js's "Collecting page data" build step,
  // and the prod Lambda runtime, never load `@libsql/client`'s default
  // node entry — that entry pulls in the `libsql` package, which loads a
  // platform-specific native binary (`@libsql/linux-x64-gnu`) at module
  // init that isn't reliably present in Vercel's installed node_modules
  // and explodes the build with MODULE_NOT_FOUND. In prod we only ever
  // talk to Turso over HTTPS, so `@libsql/client/web` (pure JS, fetch-
  // based) is sufficient. Dev keeps the native client for `file:` URLs.
  // The require is inside this function so neither path is touched until
  // a real request hits the proxy.
  const createClient: typeof import('@libsql/client').createClient = isDev
    ? require('@libsql/client').createClient
    : require('@libsql/client/web').createClient
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
export * from '@kasero/shared/db/schema'
