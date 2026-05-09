import 'server-only'
import { resolve } from 'path'
import type { drizzle as drizzleHttp } from 'drizzle-orm/libsql/http'
import type { Client } from '@libsql/client'
import * as schema from '@kasero/shared/db/schema'

let _client: Client | undefined
let _db: ReturnType<typeof drizzleHttp<typeof schema>> | undefined

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
  // Lazy require so neither the native libsql client nor the matching
  // drizzle adapter is loaded at module init. Without this, Vercel's
  // "Collecting page data" build step explodes with:
  //
  //   Cannot find module '@libsql/linux-x64-gnu'
  //   Require stack: /vercel/path0/node_modules/libsql/index.js
  //
  // because BOTH `@libsql/client` (default node entry) AND
  // `drizzle-orm/libsql` (default driver, which has a top-level
  // `import { createClient } from "@libsql/client"`) statically pull in
  // the `libsql` package and trigger its platform-binary load.
  //
  // In prod we only ever talk to Turso over HTTPS, so `@libsql/client/web`
  // + `drizzle-orm/libsql/http` (both pure JS, fetch-based, no native
  // deps) cover everything. Dev keeps the native pair for `file:` URLs.
  if (isDev) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client') as typeof import('@libsql/client')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/libsql') as typeof import('drizzle-orm/libsql')
    _client = createClient({ url, authToken })
    _db = drizzle(_client, { schema })
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client/web') as typeof import('@libsql/client/web')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/libsql/http') as typeof import('drizzle-orm/libsql/http')
    _client = createClient({ url, authToken })
    _db = drizzle(_client, { schema })
  }
  return _db
}

// Proxy so existing `import { db } from '@/db'` callers keep working without
// constructing the libsql client at module-load time (which breaks Next.js
// build-time page-data collection when env vars are absent).
export const db = new Proxy({} as ReturnType<typeof drizzleHttp<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  },
})

// Re-export schema for convenience
export * from '@kasero/shared/db/schema'
